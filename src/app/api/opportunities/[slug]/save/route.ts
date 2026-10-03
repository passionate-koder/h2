import { z } from "zod";
import { getIdentity, validOrigin } from "@/lib/accounts";
import { HttpError, readJson, safeRoute } from "@/lib/identity/http";
import { setSaved } from "@/lib/marketplace/repository";
import { NextResponse } from "next/server";
export const POST = safeRoute("opportunity.save", async (request: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const identity = await getIdentity(); if (!identity) throw new HttpError("Please sign in.", 401); if (!validOrigin(request)) throw new HttpError("Invalid request.", 403);
  const parsed = z.object({ saved: z.boolean() }).safeParse(await readJson(request)); if (!parsed.success) throw new HttpError("Invalid save request.", 400);
  return NextResponse.json(await setSaved(identity, (await params).slug, parsed.data.saved));
});
