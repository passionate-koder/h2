import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { identityConfig } from "@/lib/identity/config";
import { safeRoute } from "@/lib/identity/http";
export const GET = safeRoute("auth.callback", async (request: Request) => {
  const config = identityConfig();
  const url = new URL(request.url);
  const failure = () => NextResponse.redirect(config.siteUrl + "/auth/verify?error=expired");
  if (config.mode !== "supabase") return failure();
  const client = await supabaseServer();
  const code = url.searchParams.get("code");
  const hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) return failure();
  } else if (hash && (type === "signup" || type === "recovery" || type === "email")) {
    const { error } = await client.auth.verifyOtp({ token_hash: hash, type });
    if (error) return failure();
  } else return failure();
  const recovery = type === "recovery" || url.searchParams.get("next") === "/auth/update-password";
  return NextResponse.redirect(config.siteUrl + (recovery ? "/auth/update-password" : "/onboarding"));
});
