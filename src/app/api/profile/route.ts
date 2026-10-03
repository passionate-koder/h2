import { NextResponse } from "next/server";
import { getIdentity, updateAccount, validOrigin } from "@/lib/accounts";
import { profilePatchSchema } from "@/lib/identity/validation";
import { readJson, safeRoute, HttpError } from "@/lib/identity/http";
export const PATCH = safeRoute("profile.update", async (request: Request) => {
  const identity = await getIdentity();
  if (!identity) throw new HttpError("Please sign in.", 401);
  if (!validOrigin(request)) throw new HttpError("Invalid request.", 403);
  const data = await readJson(request, 7500000);
  if (JSON.stringify(data)?.length > 7500000) throw new HttpError("Profile is too large.", 413);
  const parsed = profilePatchSchema.safeParse(data);
  if (!parsed.success) throw new HttpError(parsed.error.issues[0]?.message || "Invalid profile.", 400);
  const account = await updateAccount(identity, a => ({ ...a, profile: { ...a.profile, ...parsed.data, updatedAt: new Date().toISOString() } }));
  return NextResponse.json({ user: account.profile });
});
