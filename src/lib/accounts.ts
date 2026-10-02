import "server-only";
import { cookies } from "next/headers";
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import profiles from "@/content/accounts/profiles.json";
import registrationSeeds from "@/content/accounts/registrations.json";
import type {
  AccountProfile,
  AccountRole,
  AccountStore,
  Registration,
} from "@/lib/account-types";
const root = path.join(process.cwd(), ".local-data", "accounts");
const cookieName = "hc-account";
export function seedProfile(role: AccountRole): AccountProfile {
  const raw = profiles[role];
  const student = raw.student_details;
  const working = raw.working_professional_details;
  return {
    role,
    uid: raw.uid,
    email: raw.email,
    fullName: raw.full_name,
    gender: raw.gender,
    phone: raw.phone_number,
    city: [raw.city.name, raw.city.state, raw.city.country].join(", "),
    profileType: role === "student" ? "student" : "working_professional",
    professionalCategory: working?.professional_type || "startup",
    organization: working?.startup_details?.startup_name || "",
    website: working?.startup_details?.startup_website || "",
    pitch: working?.startup_details?.elevator_pitch || "",
    jobTitle: "",
    college: student?.college_name || "",
    collegeCity: student?.college_city || "",
    degree: student?.degree_name || "",
    yearOfStudy: String(student?.year_of_study || ""),
    graduationYear: String(student?.year_of_graduation || ""),
    skills: [],
    links: Object.fromEntries(
      Object.entries(raw.links).map(([key, value]) => [key, value || ""]),
    ),
    transactional: raw.communication_preferences.transactional,
    promotional: raw.communication_preferences.promotional,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    resumeName: "",
    details: {},
  };
}
function signature(value: string) {
  const secret = process.env.HC_SESSION_SECRET;
  if (!secret)
    throw new Error("Local account session secret is not configured");
  return createHmac("sha256", secret).update(value).digest("base64url");
}
export async function getAccountRole(): Promise<AccountRole | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  try {
    const [payload, sig] = token.split(".");
    const expected = signature(payload);
    if (
      !sig ||
      sig.length !== expected.length ||
      !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    )
      return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.expires > Date.now() &&
      ["student", "professional"].includes(data.role)
      ? data.role
      : null;
  } catch {
    return null;
  }
}
export async function signIn(email: string, password: string) {
  const role: AccountRole | undefined = (
    ["student", "professional"] as AccountRole[]
  ).find((r) => profiles[r].email.toLowerCase() === email.toLowerCase());
  if (!role) return null;
  const value =
    role === "student"
      ? process.env.HC_STUDENT_PASSWORD_HASH
      : process.env.HC_PRO_PASSWORD_HASH;
  if (!value) return null;
  const [salt, hash] = value.split(":");
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return null;
  const payload = Buffer.from(
    JSON.stringify({
      role,
      expires: Date.now() + 7 * 86400000,
      nonce: randomBytes(12).toString("hex"),
    }),
  ).toString("base64url");
  (await cookies()).set(cookieName, payload + "." + signature(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.HC_COOKIE_SECURE === "true",
    path: "/",
    maxAge: 7 * 86400,
  });
  return role;
}
export async function signOut() {
  (await cookies()).delete(cookieName);
}
export async function readAccount(role: AccountRole): Promise<AccountStore> {
  const seeds =
    (registrationSeeds as Partial<Record<AccountRole, Registration[]>>)[role] ||
    [];
  try {
    const stored: AccountStore = JSON.parse(
      await fs.readFile(path.join(root, role + ".json"), "utf8"),
    );
    return {
      ...stored,
      registrations: [
        ...seeds.filter(
          (seed) => !stored.registrations.some((r) => r.slug === seed.slug),
        ),
        ...stored.registrations,
      ],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return { profile: seedProfile(role), registrations: seeds };
  }
}
const locks = new Map<AccountRole, Promise<unknown>>();
export async function updateAccount(
  role: AccountRole,
  update: (account: AccountStore) => AccountStore,
) {
  const operation = (locks.get(role) || Promise.resolve())
    .catch(() => {})
    .then(async () => {
      const account = update(await readAccount(role));
      await fs.mkdir(root, { recursive: true });
      const temporary = path.join(
        root,
        role + "." + randomBytes(6).toString("hex") + ".tmp",
      );
      await fs.writeFile(temporary, JSON.stringify(account, null, 2));
      await fs.rename(temporary, path.join(root, role + ".json"));
      return account;
    });
  locks.set(role, operation);
  return operation;
}
export function validOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const incoming = new URL(origin);
    const target = new URL(request.url);
    return (
      incoming.origin === target.origin ||
      (incoming.host === request.headers.get("host") &&
        incoming.protocol === target.protocol)
    );
  } catch {
    return false;
  }
}
