"use client";

import { useAutoCompile } from "@/hooks/useAutoCompile";
import { useCompiledAgo } from "@/hooks/useCompiledAgo";
import { useCompilePreview } from "@/hooks/useCompilePreview";
export type { CompileError } from "@/lib/compile";
export type { CompileStatus } from "@/hooks/useCompilePreview";

export function useCompiler(latex: string) {
  const { pdfData, errors, status, compiledAt, compile } = useCompilePreview();
  const compiledAgo = useCompiledAgo(compiledAt);
  useAutoCompile(latex, compile);

  return {
    pdfData,
    errors,
    status,
    compiledAgo,
    compile,
  };
}
