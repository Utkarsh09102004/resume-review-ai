"use client";

import { useEffect } from "react";
import { useDebouncedCallback } from "use-debounce";

export function useAutoCompile(
  latex: string,
  compile: (source: string) => Promise<void>
) {
  const debouncedCompile = useDebouncedCallback((source: string) => {
    void compile(source);
  }, 800);

  useEffect(() => {
    if (!latex.trim()) {
      return;
    }

    debouncedCompile(latex);

    return () => {
      debouncedCompile.cancel?.();
    };
  }, [latex, debouncedCompile]);
}
