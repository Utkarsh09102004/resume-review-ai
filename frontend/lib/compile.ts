import axios from "axios";
import api from "@/lib/api";

export interface CompileError {
  line: number;
  message: string;
}

export async function compileLatex(
  source: string,
  signal?: AbortSignal
): Promise<Uint8Array> {
  const response = await api.post(
    "/api/compile",
    { latex: source },
    {
      responseType: "arraybuffer",
      signal,
    }
  );

  return new Uint8Array(response.data);
}

export function extractCompileErrors(error: unknown): CompileError[] {
  if (!axios.isAxiosError(error) || !error.response) {
    return [{ line: 0, message: "Network error during compilation" }];
  }

  try {
    const errorText = new TextDecoder().decode(error.response.data);
    const errorJson = JSON.parse(errorText);
    const detail: unknown = errorJson.detail;

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

    if (typeof detail === "string") {
      return [{ line: 0, message: detail }];
    }
  } catch {
    // Fall through to the generic failure message below.
  }

  return [{ line: 0, message: "Compilation failed" }];
}
