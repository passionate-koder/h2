import { NextResponse } from "next/server";
import { z } from "zod";
import { activateRole, getIdentity, validOrigin } from "@/lib/accounts";
import { readJson, safeRoute, HttpError } from "@/lib/identity/http";
export const POST = safeRoute("workspace.activate", async (request: Request) => {
  const identity = await getIdentity();
  if (!identity) throw new HttpError("Please sign in.", 401);
  if (!validOrigin(request)) throw new HttpError("Invalid request.", 403);
  const data = z.object({ assignmentId: z.string().min(1).max(100) }).strict().safeParse(await readJson(request));
  if (!data.success) throw new HttpError("Invalid role selection.", 400);
  await activateRole(identity, data.data.assignmentId);
  return NextResponse.json({ ok: true });
});
