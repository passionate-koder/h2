import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { identityConfig } from "@/lib/identity/config";
export async function middleware(request: NextRequest) {
  const config = identityConfig();
  let response = NextResponse.next({ request });
  if (config.mode === "local") return response;
  const client = createServerClient(config.url!, config.key!, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll: (values, headers) => {
      values.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
    },
  } });
  await client.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/auth/:path*", "/api/:path*", "/profile", "/onboarding", "/my-events/:path*", "/hackathons/register/:path*"] };
