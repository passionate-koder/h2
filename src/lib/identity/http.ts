import { NextResponse } from "next/server";
import { logEvent } from "./logger";
export class HttpError extends Error { constructor(message: string, public status: number) { super(message); } }
export function safeRoute<T extends unknown[]>(operation: string, handler: (...args: T) => Promise<Response>) {
  return async (...args: T) => {
    try { const response = await handler(...args); response.headers.set("Cache-Control", "no-store"); return response; }
    catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      logEvent("request.failed", { operation, status });
      return NextResponse.json({ message: error instanceof HttpError ? error.message : "Unable to complete the request. Please try again." }, { status, headers: { "Cache-Control": "no-store" } });
    }
  };
}

export async function readJson(request: Request, limit = 65536): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > limit) throw new HttpError("Request is too large.", 413);
  if (!request.body) throw new HttpError("Invalid request.", 400);
  const reader = request.body.getReader();
  let total = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > limit) { await reader.cancel(); throw new HttpError("Request is too large.", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new HttpError("Invalid JSON request.", 400); }
}
