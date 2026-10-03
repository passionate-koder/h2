import { z } from "zod";
import { readJson, safeRoute } from "@/lib/identity/http";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { saveAnonymousInquiry } from "@/lib/identity/inquiry-repository";
import { getIdentity, updateAccount, validOrigin } from "@/lib/accounts";
async function handler(request: Request) {
  if (!validOrigin(request))
    return NextResponse.json({ message: "Invalid request." }, { status: 403 });
  const keys = ["name", "email", "phone", "country", "organizationType", "organization", "designation", "programType"];
  const schema = z.object({
    name: z.string().trim().min(1).max(500), email: z.string().email().max(500),
    phone: z.string().trim().min(1).max(500), country: z.string().trim().min(1).max(500),
    organizationType: z.string().trim().min(1).max(500), organization: z.string().trim().min(1).max(500),
    designation: z.string().trim().min(1).max(500), programType: z.string().trim().min(1).max(500), details: z.string().max(5000),
  });
  const result = schema.safeParse(await readJson(request));
  if (!result.success) return NextResponse.json({ message: "Please complete all required fields." }, { status: 400 });
  const data: Record<string,string> = result.data;
  const inquiry = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    details: Object.fromEntries([...keys, "details"].map((k) => [k, data[k]])),
  };
  const role = await getIdentity();
  if (role)
    await updateAccount(role, (a) => ({
      ...a,
      hostInquiries: [...(a.hostInquiries || []), inquiry],
    }));
  else await saveAnonymousInquiry(inquiry);
  return NextResponse.json({ ok: true, id: inquiry.id });
}

export const POST = safeRoute("host", handler);
