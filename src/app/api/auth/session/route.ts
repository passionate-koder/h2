import { safeRoute } from "@/lib/identity/http";
import { NextResponse } from "next/server";
import { getIdentity, readAccount } from "@/lib/accounts";
async function handler() {
  const role = await getIdentity();
  return NextResponse.json(
    { user: role ? (await readAccount(role)).profile : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const GET = safeRoute("session", handler);
