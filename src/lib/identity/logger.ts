// Only known metadata is accepted. Never serialize errors or arbitrary request bodies.
export function logEvent(event: "identity.mode" | "request.failed", metadata: { mode?: "local" | "supabase"; operation?: string; status?: number }) {
  console.info(JSON.stringify({ event, mode: metadata.mode, operation: metadata.operation, status: metadata.status, timestamp: new Date().toISOString() }));
}
