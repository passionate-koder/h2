import { getIdentity } from "@/lib/accounts";
import { HttpError, safeRoute } from "@/lib/identity/http";
import { employerCsv } from "@/lib/marketplace/repository";
export const GET = safeRoute("employer.export", async (_request: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const identity = await getIdentity(); if (!identity) throw new HttpError("Please sign in.", 401); const { slug } = await params;
  return new Response(await employerCsv(identity, slug), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${slug}-applications.csv"`, "X-Content-Type-Options": "nosniff" } });
});
