export function identityConfig(env: Record<string, string | undefined> = process.env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (Boolean(url) !== Boolean(key)) throw new Error("Configure both Supabase URL and anonymous key.");
  if (url && !/^https?:\/\//.test(url)) throw new Error("Invalid Supabase URL.");
  const environment = env.APP_ENV || "local";
  if (!["local", "staging", "production"].includes(environment)) throw new Error("Invalid APP_ENV.");
  if (environment !== "local" && !url) throw new Error("Cloud authentication is required outside local environments.");
  const parsed = new URL(env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100");
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Invalid site URL.");
  if (environment !== "local" && parsed.protocol !== "https:") throw new Error("HTTPS is required outside local environments.");
  return { mode: url && key ? "supabase" as const : "local" as const, url, key, siteUrl: parsed.origin, environment };
}
