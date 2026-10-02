import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getAccountRole, updateAccount, validOrigin } from "@/lib/accounts";
export async function POST(request: Request) {
  if (!validOrigin(request))
    return NextResponse.json({ message: "Invalid request." }, { status: 403 });
  const data = await request.json().catch(() => null);
  const keys = [
    "name",
    "email",
    "phone",
    "country",
    "organizationType",
    "organization",
    "designation",
    "programType",
  ];
  if (
    !data ||
    keys.some(
      (k) =>
        typeof data[k] !== "string" || !data[k].trim() || data[k].length > 500,
    ) ||
    !/^\S+@\S+\.\S+$/.test(data.email) ||
    typeof data.details !== "string" ||
    data.details.length > 5000
  )
    return NextResponse.json(
      { message: "Please complete all required fields." },
      { status: 400 },
    );
  const inquiry = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    details: Object.fromEntries([...keys, "details"].map((k) => [k, data[k]])),
  };
  const role = await getAccountRole();
  if (role)
    await updateAccount(role, (a) => ({
      ...a,
      hostInquiries: [...(a.hostInquiries || []), inquiry],
    }));
  else {
    const root = path.join(process.cwd(), ".local-data", "inquiries");
    await fs.mkdir(root, { recursive: true });
    await fs.writeFile(
      path.join(root, inquiry.id + ".json"),
      JSON.stringify(inquiry),
    );
  }
  return NextResponse.json({ ok: true, id: inquiry.id });
}
