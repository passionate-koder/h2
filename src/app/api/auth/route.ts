import { NextResponse } from "next/server";
import { authMode, getIdentity, readAccount, signIn, signOut, validOrigin } from "@/lib/accounts";
import { supabaseServer } from "@/lib/supabase/server";
import { identityConfig } from "@/lib/identity/config";
import { authSchema } from "@/lib/identity/validation";
import { readJson, HttpError, safeRoute } from "@/lib/identity/http";
const attempts = new Map<string, { count: number; until: number }>();
export const POST = safeRoute("auth", async (request: Request) => {
  if (!validOrigin(request)) throw new HttpError("Invalid request.", 403);
  const parsed = authSchema.safeParse(await readJson(request));
  if (!parsed.success) throw new HttpError("Enter valid authentication details.", 400);
  const data = parsed.data;
  if (data.action === "logout") { await signOut(); return NextResponse.json({ ok: true }); }
  const key = "email" in data ? data.email.toLowerCase() : "password-update";
  const now = Date.now();
  for (const [email, entry] of attempts) if (entry.until <= now) attempts.delete(email);
  if (attempts.size >= 10000 && !attempts.has(key)) throw new HttpError("Please try again later.", 429);
  const attempt = attempts.get(key);
  if (attempt && attempt.count >= 10) throw new HttpError("Too many attempts. Please try again in a few minutes.", 429);
  attempts.set(key, { count: (attempt?.count || 0) + 1, until: attempt?.until || now + 300000 });
  if (data.action === "signin") {
    const identity = await signIn(data.email, data.password);
    if (!identity) throw new HttpError("Invalid email or password. Please try again.", 401);
    attempts.delete(key);
    return NextResponse.json({ ok: true, user: (await readAccount(identity)).profile });
  }
  if (authMode() === "local") throw new HttpError("Email delivery and new account creation are not connected in this local preview.", 503);
  const client = await supabaseServer();
  const site = identityConfig().siteUrl;
  if (data.action === "signup") {
    const { error } = await client.auth.signUp({ email: data.email, password: data.password, options: { data: { full_name: data.name }, emailRedirectTo: site + "/auth/callback" } });
    // Same response for existing and new accounts to avoid account enumeration.
    if (error && !["user_already_exists", "email_exists"].includes(error.code || "")) throw new HttpError("Unable to create an account. Please try again later.", 400);
    return NextResponse.json({ message: "If registration is available for this email, check your inbox to verify your account." });
  }
  if (data.action === "reset") {
    const { error } = await client.auth.resetPasswordForEmail(data.email, { redirectTo: site + "/auth/callback?next=/auth/update-password" });
    if (error) throw new HttpError("Unable to request recovery. Please try again later.", 503);
    return NextResponse.json({ message: "If an account is eligible, you will receive a password reset email." });
  }
  if (data.action === "verify") {
    await client.auth.resend({ type: "signup", email: data.email, options: { emailRedirectTo: site + "/auth/callback" } });
    return NextResponse.json({ message: "If verification is needed, check your inbox for an email." });
  }
  if (!await getIdentity()) throw new HttpError("Open a valid recovery link or sign in first.", 401);
  const { error } = await client.auth.updateUser({ password: data.password });
  if (error) throw new HttpError("Unable to update your password. Open a fresh recovery link and try again.", 400);
  await signOut();
  return NextResponse.json({ message: "Password updated. Sign in with your new password." });
});
