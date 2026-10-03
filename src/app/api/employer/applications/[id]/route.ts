import { z } from "zod";
import { getIdentity, validOrigin } from "@/lib/accounts";
import { HttpError, readJson, safeRoute } from "@/lib/identity/http";
import { addEmployerNote, updateApplicationStatus } from "@/lib/marketplace/repository";
import { NextResponse } from "next/server";
const schema = z.discriminatedUnion("action", [z.object({ action: z.literal("status"), status: z.enum(["reviewing", "shortlisted", "rejected", "accepted"]), reason: z.string().trim().max(1000).optional() }), z.object({ action: z.literal("note"), body: z.string().trim().min(1).max(5000) })]);
export const PATCH = safeRoute("employer.application", async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const identity = await getIdentity(); if (!identity) throw new HttpError("Please sign in.", 401); if (!validOrigin(request)) throw new HttpError("Invalid request.", 403);
  const parsed = schema.safeParse(await readJson(request)); if (!parsed.success) throw new HttpError("Invalid review update.", 400); const { id } = await params;
  const application = parsed.data.action === "note" ? await addEmployerNote(identity, id, parsed.data.body) : await updateApplicationStatus(identity, id, parsed.data.status, parsed.data.reason);
  return NextResponse.json({ application });
});
