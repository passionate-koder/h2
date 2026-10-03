import { NextResponse } from "next/server";
import { getIdentity, updateAccount, validOrigin } from "@/lib/accounts";
import { onboardingSchema } from "@/lib/identity/validation";
import { readJson, safeRoute, HttpError } from "@/lib/identity/http";
export const POST = safeRoute("onboarding.save", async (request: Request) => {
  const identity = await getIdentity();
  if (!identity) throw new HttpError("Please sign in.", 401);
  if (!validOrigin(request)) throw new HttpError("Invalid request.", 403);
  const result = onboardingSchema.safeParse(await readJson(request));
  if (!result.success) throw new HttpError("Please complete your learner goals and background.", 400);
  const account = await updateAccount(identity, a => ({ ...a, profile: { ...a.profile, ...result.data, updatedAt: new Date().toISOString() } }));
  return NextResponse.json({ user: account.profile });
});
