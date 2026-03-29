"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import api from "@/lib/api";
import axios from "axios";

export interface CompileError {
  line: number;
  message: string;
}

export type CompileStatus = "idle" | "compiling" | "compiled" | "error";

export function useCompiler(latex: string) {
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [errors, setErrors] = useState<CompileError[]>([]);
  const [status, setStatus] = useState<CompileStatus>("idle");
  const [compiledAgo, setCompiledAgo] = useState<string>("");
  const compiledAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update "compiled X ago" label
  const updateAgoLabel = useCallback(() => {
    if (compiledAtRef.current === null) return;
    const seconds = Math.round((Date.now() - compiledAtRef.current) / 1000);
    if (seconds < 5) {
      setCompiledAgo("just now");
    } else if (seconds < 60) {
      setCompiledAgo(`${seconds}s ago`);
    } else {
      const minutes = Math.floor(seconds / 60);
      setCompiledAgo(`${minutes}m ago`);
    }
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(updateAgoLabel, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [updateAgoLabel]);

  const compile = useCallback(
    async (source: string) => {
      if (!source.trim()) return;

      setStatus("compiling");

      try {
        const resp = await api.post("/api/compile", { latex: source }, {
          responseType: "arraybuffer",
        });
        const data = new Uint8Array(resp.data);
        setPdfData(data);
        setErrors([]);
        setStatus("compiled");
        compiledAtRef.current = Date.now();
        updateAgoLabel();
      } catch (err) {
        if (axios.isAxiosError(err) && err.response) {
          try {
            const errorText = new TextDecoder().decode(err.response.data);
            const errorJson = JSON.parse(errorText);
            const detail: unknown = errorJson.detail;

            if (typeof detail === "object" && detail !== null) {
              const obj = detail as Record<string, unknown>;
              if (Array.isArray(obj.errors)) {
                setErrors(obj.errors as CompileError[]);
              } else if (typeof obj.log === "string") {
                setErrors([{ line: 0, message: obj.log }]);
              } else {
                setErrors([{ line: 0, message: JSON.stringify(detail) }]);
              }
            } else if (typeof detail === "string") {
              setErrors([{ line: 0, message: detail }]);
            } else {
              setErrors([{ line: 0, message: "Compilation failed" }]);
            }
          } catch {
            setErrors([{ line: 0, message: "Compilation failed" }]);
          }
        } else {
          setErrors([{ line: 0, message: "Network error during compilation" }]);
        }
        // Keep last successful PDF — never blank preview
        setStatus("error");
      }
    },
    [updateAgoLabel]
  );

  const debouncedCompile = useDebouncedCallback((source: string) => {
    compile(source);
  }, 800);

  // Trigger debounced compile whenever latex changes
  useEffect(() => {
    if (latex.trim()) {
      debouncedCompile(latex);
    }
  }, [latex, debouncedCompile]);

  return {
    pdfData,
    errors,
    status,
    compiledAgo,
    compile,
  };
}
