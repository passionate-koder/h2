import { z } from "zod";
import { readJson, safeRoute } from "@/lib/identity/http";
import { NextResponse } from "next/server";
import { getIdentity, updateAccount, validOrigin } from "@/lib/accounts";
import programs from "@/content/accounts/registration-programs.json";
import { randomUUID } from "node:crypto";
async function handler(request: Request) {
  const role = await getIdentity();
  if (!role)
    return NextResponse.json({ message: "Please sign in." }, { status: 401 });
  if (!validOrigin(request))
    return NextResponse.json({ message: "Invalid request." }, { status: 403 });
  const result = z.object({ slug: z.string().max(200), consent: z.literal(true), share: z.literal(true), answers: z.record(z.string().max(100), z.string().max(10000)) }).safeParse(await readJson(request));
  if (!result.success) return NextResponse.json({ message: "Please complete the registration form." }, { status: 400 });
  const data = result.data;
  const program = programs.find(p => p.slug === data.slug);
  if (!program || !program.open) return NextResponse.json({ message: "This program is unavailable." }, { status: 400 });
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

export const POST = safeRoute("registrations", handler);
