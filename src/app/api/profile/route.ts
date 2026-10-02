import { NextResponse } from "next/server";
import { getAccountRole, updateAccount, validOrigin } from "@/lib/accounts";
import type { AccountProfile } from "@/lib/account-types";
export async function PATCH(request: Request) {
  const role = await getAccountRole();
  if (!role)
    return NextResponse.json({ message: "Please sign in." }, { status: 401 });
  if (!validOrigin(request))
    return NextResponse.json({ message: "Invalid request." }, { status: 403 });
  const data = await request.json().catch(() => null);
  const bad = (message: string) =>
    NextResponse.json({ message }, { status: 400 });
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    JSON.stringify(data).length > 7500000
  )
    return bad("Invalid profile or oversized file.");
  const strings = [
    "fullName",
    "gender",
    "phone",
    "city",
    "profileType",
    "professionalCategory",
    "organization",
    "website",
    "pitch",
    "jobTitle",
    "college",
    "collegeCity",
    "degree",
    "yearOfStudy",
    "graduationYear",
    "resumeName",
    "resumeData",
  ];
  for (const key of strings)
    if (
      data[key] !== undefined &&
      (typeof data[key] !== "string" ||
        (key !== "resumeData" && data[key].length > 10000))
    )
      return bad("Invalid profile field.");
  if (
    data.fullName !== undefined &&
    (!data.fullName.trim() || data.fullName.length > 120)
  )
    return bad("Please enter your full name.");
  if (
    data.profileType &&
    !["student", "working_professional"].includes(data.profileType)
  )
    return bad("Invalid profile type.");
  if (
    data.skills !== undefined &&
    (!Array.isArray(data.skills) ||
      data.skills.length > 100 ||
      data.skills.some((s: unknown) => typeof s !== "string" || s.length > 100))
  )
    return bad("Invalid skills.");
  for (const key of ["links", "details"])
    if (
      data[key] !== undefined &&
      (!data[key] ||
        typeof data[key] !== "object" ||
        Array.isArray(data[key]) ||
        Object.values(data[key]).some(
          (v) => typeof v !== "string" || v.length > 10000,
        ))
    )
      return bad("Invalid profile details.");
  for (const value of [...Object.values(data.links || {}), data.website])
    if (
      value &&
      (typeof value !== "string" || !/^https?:\/\/[^\s]+$/i.test(value))
    )
      return bad("Links must begin with https:// or http://.");
  if (
    data.resumeData &&
    !/^data:application\/pdf;base64,[A-Za-z0-9+/=]+$/.test(data.resumeData)
  )
    return bad("Please upload a PDF resume.");
  for (const key of ["transactional", "promotional"])
    if (data[key] !== undefined && typeof data[key] !== "boolean")
      return bad("Invalid communication preference.");
  const allowed = [
    ...strings,
    "skills",
    "links",
    "details",
    "transactional",
    "promotional",
  ];
  const changes = Object.fromEntries(
    Object.entries(data).filter(([key]) => allowed.includes(key)),
  ) as Partial<AccountProfile>;
  const account = await updateAccount(role, (a) => ({
    ...a,
    profile: { ...a.profile, ...changes, updatedAt: new Date().toISOString() },
  }));
  return NextResponse.json({ user: account.profile });
}
