import { NextResponse } from "next/server";
import { createAuthenticatedApi } from "@/lib/api";

export const runtime = "nodejs";

function createProxyHeaders(sourceHeaders: Record<string, unknown>) {
  const headers = new Headers({
    "Cache-Control": "no-store",
  });

  const contentType = sourceHeaders["content-type"];
  if (typeof contentType === "string" && contentType) {
    headers.set("Content-Type", contentType);
  }

  const contentDisposition = sourceHeaders["content-disposition"];
  if (typeof contentDisposition === "string" && contentDisposition) {
    headers.set("Content-Disposition", contentDisposition);
  }

  return headers;
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON body" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const api = await createAuthenticatedApi();

  try {
    const response = await api.post<ArrayBuffer>("/api/compile", payload, {
      responseType: "arraybuffer",
      validateStatus: () => true,
    });

    return new NextResponse(response.data, {
      status: response.status,
      headers: createProxyHeaders(response.headers),
    });
  } catch {
    return NextResponse.json(
      { detail: "Failed to reach compile service" },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
