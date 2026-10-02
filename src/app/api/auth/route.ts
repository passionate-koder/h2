import { NextResponse } from "next/server";
import { readAccount, signIn, signOut, validOrigin } from "@/lib/accounts";
const attempts = new Map<string, { count: number; until: number }>();
export async function POST(request: Request) {
  if (!validOrigin(request))
    return NextResponse.json({ message: "Invalid request." }, { status: 403 });
  const data = await request.json().catch(() => null);
  if (!data)
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  if (data.action === "logout") {
    await signOut();
    return NextResponse.json({ ok: true });
  }
  if (data.action !== "signin")
    return NextResponse.json(
      {
        message:
          "Email delivery and new account creation are not connected in this local preview.",
      },
      { status: 503 },
    );
  if (
    typeof data.email !== "string" ||
    typeof data.password !== "string" ||
    data.password.length > 256
  )
    return NextResponse.json(
      { message: "Enter a valid email and password." },
      { status: 400 },
    );
  const key = data.email.toLowerCase();
  const attempt = attempts.get(key);
  if (attempt && attempt.until > Date.now() && attempt.count >= 10)
    return NextResponse.json(
      { message: "Too many attempts. Please try again in a few minutes." },
      { status: 429 },
    );
  const role = await signIn(data.email, data.password);
  if (!role) {
    attempts.set(key, {
      count: attempt && attempt.until > Date.now() ? attempt.count + 1 : 1,
      until: Date.now() + 300000,
    });
    return NextResponse.json(
      { message: "Invalid email or password. Please try again." },
      { status: 401 },
    );
  }
  attempts.delete(key);
  return NextResponse.json({
    ok: true,
    user: (await readAccount(role)).profile,
  });
}
