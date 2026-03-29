"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CompileRequestError,
  compileLatex,
  extractCompileErrors,
  type CompileError,
} from "@/lib/compile";

export type CompileStatus = "idle" | "compiling" | "compiled" | "error";

export function useCompilePreview() {
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [errors, setErrors] = useState<CompileError[]>([]);
  const [status, setStatus] = useState<CompileStatus>("idle");
  const [compiledAt, setCompiledAt] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const compile = useCallback(async (source: string) => {
    if (!source.trim()) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("compiling");

    try {
      const data = await compileLatex(source, controller.signal);
      setPdfData(data);
      setErrors([]);
      setStatus("compiled");
      setCompiledAt(Date.now());
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      if (error instanceof CompileRequestError) {
        setErrors(error.errors);
      } else {
        setErrors(extractCompileErrors(error));
      }
      setStatus("error");
    }
  }, []);

  return {
    pdfData,
    errors,
    status,
    compiledAt,
    compile,
  };
}
