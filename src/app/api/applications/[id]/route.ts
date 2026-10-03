import { z } from "zod";
import { getIdentity, validOrigin } from "@/lib/accounts";
import { HttpError, readJson, safeRoute } from "@/lib/identity/http";
import { withdrawApplication } from "@/lib/marketplace/repository";
import { NextResponse } from "next/server";
export const PATCH = safeRoute("application.withdraw", async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const identity = await getIdentity(); if (!identity) throw new HttpError("Please sign in.", 401); if (!validOrigin(request)) throw new HttpError("Invalid request.", 403);
  const parsed = z.object({ action: z.literal("withdraw") }).safeParse(await readJson(request)); if (!parsed.success) throw new HttpError("Invalid request.", 400);
  return NextResponse.json({ application: await withdrawApplication(identity, (await params).id) });
});
