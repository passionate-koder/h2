import { z } from "zod";
import { getIdentity, readAccount, validOrigin } from "@/lib/accounts";
import { answersSchema } from "@/lib/marketplace/domain";
import { saveApplication } from "@/lib/marketplace/repository";
import { HttpError, readJson, safeRoute } from "@/lib/identity/http";
import { NextResponse } from "next/server";
const schema = z.object({ slug: z.string().trim().max(200), answers: answersSchema, action: z.enum(["draft", "submit"]) });
export const POST = safeRoute("application.save", async (request: Request) => {
  const identity = await getIdentity(); if (!identity) throw new HttpError("Please sign in.", 401); if (!validOrigin(request)) throw new HttpError("Invalid request.", 403);
  const parsed = schema.safeParse(await readJson(request)); if (!parsed.success) throw new HttpError("Invalid application.", 400);
  const account = await readAccount(identity); const application = await saveApplication(identity, account.profile, parsed.data.slug, parsed.data.answers, parsed.data.action === "submit");
  return NextResponse.json({ application });
});
