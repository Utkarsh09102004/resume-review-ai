export interface CompileError {
  line: number;
  message: string;
}

export class CompileRequestError extends Error {
  readonly errors: CompileError[];

  constructor(errors: CompileError[]) {
    super(errors[0]?.message ?? "Compilation failed");
    this.name = "CompileRequestError";
    this.errors = errors;
  }
}

function normalizeCompileErrors(detail: unknown): CompileError[] {
  if (typeof detail === "object" && detail !== null) {
    const objectDetail = detail as Record<string, unknown>;

    if (Array.isArray(objectDetail.errors)) {
      return objectDetail.errors as CompileError[];
    }

    if (typeof objectDetail.log === "string") {
      return [{ line: 0, message: objectDetail.log }];
    }

    return [{ line: 0, message: JSON.stringify(detail) }];
  }

  if (typeof detail === "string" && detail) {
    return [{ line: 0, message: detail }];
  }

  return [{ line: 0, message: "Compilation failed" }];
}

export function extractCompileErrors(error: unknown): CompileError[] {
  if (error instanceof CompileRequestError) {
    return error.errors;
  }

  return [{ line: 0, message: "Network error during compilation" }];
}

export async function compileLatex(
  source: string,
  signal?: AbortSignal
): Promise<Uint8Array> {
  const response = await fetch("/api/compile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ latex: source }),
    cache: "no-store",
    signal,
  });

  if (response.ok) {
    return new Uint8Array(await response.arrayBuffer());
  }

  let responseText = "";
  try {
    responseText = await response.text();
  } catch {
    throw new CompileRequestError([{ line: 0, message: "Compilation failed" }]);
  }

  if (!responseText) {
    throw new CompileRequestError([{ line: 0, message: "Compilation failed" }]);
  }

  try {
    const parsed = JSON.parse(responseText) as { detail?: unknown };
    throw new CompileRequestError(normalizeCompileErrors(parsed.detail));
  } catch (error) {
    if (error instanceof CompileRequestError) {
      throw error;
    }

    throw new CompileRequestError([{ line: 0, message: responseText }]);
  }
}

export const compileLatexDocument = compileLatex;
