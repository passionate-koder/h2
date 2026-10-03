import { beforeEach, describe, expect, it, vi } from "vitest";
import { scryptSync } from "node:crypto";
const mocks = vi.hoisted(() => ({ files: new Map<string,string>(), cookie: undefined as string | undefined }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => mocks.cookie ? { value: mocks.cookie } : undefined, set: (_name: string, value: string) => { mocks.cookie = value; }, delete: () => { mocks.cookie = undefined; } }) }));
vi.mock("node:fs/promises", () => ({ default: {
  readFile: vi.fn(async (name: string) => { if (!mocks.files.has(name)) throw Object.assign(new Error("Missing"), { code: "ENOENT" }); return mocks.files.get(name); }),
  mkdir: vi.fn(async () => {}), writeFile: vi.fn(async (name: string, value: string) => { mocks.files.set(name, value); }),
  rename: vi.fn(async (from: string, to: string) => { mocks.files.set(to, mocks.files.get(from)!); mocks.files.delete(from); }),
} }));
import { seedProfile, getAccountRole as localRole, signIn as localSignIn } from "@/lib/local-accounts";
import { localRepository } from "@/lib/identity/local-repository";
import { readAccount, updateAccount, signOut, getAccountRole } from "@/lib/accounts";
const identity = { id: seedProfile("student").uid, email: seedProfile("student").email, localRole: "student" as const };
beforeEach(() => {
  mocks.files.clear(); mocks.cookie = undefined;
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", ""); vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""); vi.stubEnv("APP_ENV", "local");
  vi.stubEnv("BUILDORA_SESSION_SECRET", "unit-test-secret"); vi.stubEnv("BUILDORA_STUDENT_PASSWORD_HASH", "salt:" + scryptSync("test-password", "salt", 64).toString("hex"));
});
describe("local fallback", () => {
  it("retains seeds and persists isolated accounts with server audit events", async () => {
    const initial = await localRepository.read(identity);
    expect(initial.profile.uid).toBe(identity.id);
    expect(await localRepository.history(identity)).toEqual({ educations: [], experiences: [], projects: [] });
    await localRepository.update(identity, a => ({ ...a, profile: { ...a.profile, careerGoals: "Find a role", skills: ["TS"] } }));
    const saved = await localRepository.read(identity);
    expect(saved.profile.careerGoals).toBe("Find a role"); expect(saved.auditEvents?.[0].action).toBe("account.updated");
    expect((await localRepository.audit(identity))[0].userId).toBe(identity.id);
    const other = { id: seedProfile("professional").uid, email: seedProfile("professional").email, localRole: "professional" as const };
    expect((await localRepository.read(other)).profile.careerGoals).toBeUndefined();
  });
  it("accepts valid seeded passwords and rejects wrong passwords/tampered cookies", async () => {
    expect(await localSignIn(identity.email, "wrong")).toBeNull();
    expect(await localSignIn(identity.email, "test-password")).toBe("student");
    expect(await localRole()).toBe("student");
    mocks.cookie += "tampered"; expect(await localRole()).toBeNull();
  });
  it("rejects fabricated identities even when another user is signed in", async () => {
    await localSignIn(identity.email, "test-password");
    const session = await getAccountRole(); expect(session?.id).toBe(identity.id);
    await expect(readAccount({ ...identity, id: "victim" })).rejects.toThrow("Please sign in");
    await expect(updateAccount({ ...identity, localRole: "professional" }, a => a)).rejects.toThrow("Please sign in");
    await signOut(); await expect(readAccount(identity)).rejects.toThrow("Please sign in");
  });
  it("serializes local updates so independent edits survive", async () => {
    await Promise.all([localRepository.update(identity, a => ({ ...a, profile: { ...a.profile, desiredRole: "Engineer" } })), localRepository.update(identity, a => ({ ...a, profile: { ...a.profile, desiredIndustry: "AI" } }))]);
    const saved = await localRepository.read(identity); expect(saved.profile.desiredRole).toBe("Engineer"); expect(saved.profile.desiredIndustry).toBe("AI");
  });
});
