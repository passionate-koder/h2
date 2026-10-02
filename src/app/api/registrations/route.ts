import { NextResponse } from "next/server";
import { getAccountRole, updateAccount, validOrigin } from "@/lib/accounts";
import programs from "@/content/accounts/registration-programs.json";
import { randomUUID } from "node:crypto";
export async function POST(request: Request) {
  const role = await getAccountRole();
  if (!role)
    return NextResponse.json({ message: "Please sign in." }, { status: 401 });
  if (!validOrigin(request))
    return NextResponse.json({ message: "Invalid request." }, { status: 403 });
  const data = await request.json().catch(() => null);
  const program = programs.find((p) => p.slug === data?.slug);
  if (
    !program ||
    !program.open ||
    !data.consent ||
    !data.share ||
    !data.answers ||
    typeof data.answers !== "object" ||
    Array.isArray(data.answers)
  )
    return NextResponse.json(
      { message: "Please complete the registration form." },
      { status: 400 },
    );
  for (const q of program.questions) {
    const value = data.answers[q.id];
    if (
      (q.required && (!value || typeof value !== "string" || !value.trim())) ||
      (value && typeof value !== "string") ||
      (value && q.options.length && !(q.options as string[]).includes(value))
    )
      return NextResponse.json(
        { message: `Please complete ${q.label}.` },
        { status: 400 },
      );
  }
  const id = randomUUID();
  const account = await updateAccount(role, (a) =>
    a.registrations.some((r) => r.slug === program.slug)
      ? a
      : {
          ...a,
          registrations: [
            ...a.registrations.filter((r) => r.slug !== program.slug),
            {
              id,
              slug: program.slug,
              name: program.name,
              registeredAt: new Date().toISOString(),
              answers: data.answers,
              status: "registered",
            },
          ],
        },
  );
  const registration = account.registrations.find(
    (r) => r.slug === program.slug,
  )!;
  return NextResponse.json({
    ok: true,
    id: registration.id || registration.slug,
  });
}
