import { NextResponse } from "next/server";
import { getAccountRole, readAccount } from "@/lib/accounts";
export async function GET() {
  const role = await getAccountRole();
  return NextResponse.json(
    { user: role ? (await readAccount(role)).profile : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
