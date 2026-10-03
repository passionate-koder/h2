import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { identityConfig } from "@/lib/identity/config";
export async function supabaseServer() {
  const config = identityConfig();
  if (!config.url || !config.key) throw new Error("Supabase is not configured.");
  const jar = await cookies();
  return createServerClient(config.url, config.key, { cookies: {
    getAll: () => jar.getAll(),
    setAll: values => { try { values.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch { /* Server Components rely on middleware for refreshed cookies. */ } },
  } });
}
