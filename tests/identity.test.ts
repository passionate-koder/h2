import { describe, it, expect } from "vitest";
import { identityConfig } from "@/lib/identity/config";
import { authSchema, onboardingSchema, profilePatchSchema } from "@/lib/identity/validation";
import { canActivateRole, ownsProfile, canReadProfile } from "@/lib/identity/authorization";
const learner = { learnerSegment: "recent_graduate", city: "Bengaluru", educationLevel: "Graduate", experienceLevel: "Entry level", interests: ["AI"], skills: ["TypeScript"], desiredRole: "Engineer", desiredIndustry: "Technology", careerGoals: "First job", availability: "Full time" };
describe("configuration", () => {
  it("uses local mode with no cloud credentials", () => expect(identityConfig({}).mode).toBe("local"));
  it("uses cloud only with both public variables", () => expect(identityConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "public" }).mode).toBe("supabase"));
  it("rejects partial configuration and insecure deployment", () => {
    expect(() => identityConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co" })).toThrow();
    expect(() => identityConfig({ APP_ENV: "staging" })).toThrow();
    expect(() => identityConfig({ APP_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "public" })).toThrow();
  });
});
describe("validation", () => {
  it("validates onboarding and rejects incomplete/invalid segments", () => {
    expect(onboardingSchema.safeParse(learner).success).toBe(true);
    expect(onboardingSchema.safeParse({ ...learner, learnerSegment: "admin" }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...learner, careerGoals: " " }).success).toBe(false);
  });
  it("strips browser supplied identity and privileged fields", () => expect(profilePatchSchema.parse({ fullName: "Ada", uid: "victim", role: "admin", email: "victim@example.com", activeRoleAssignmentId: "admin" })).toEqual({ fullName: "Ada" }));
  it("rejects malicious URLs, bad preferences, invalid uploads and oversized skills", () => {
    for (const data of [{ links: { github: "javascript:alert(1)" } }, { website: "data:text/html,test" }, { transactional: "yes" }, { resumeData: "data:text/html,test" }, { skills: [123] }, { fullName: " " }, { visibility: "everyone" }]) expect(profilePatchSchema.safeParse(data).success).toBe(false);
  });
  it("rejects malformed authentication payloads", () => { for (const data of [null, [], { action: "signin", email: "invalid", password: "x" }, { action: "signup", email: "a@b.com", password: "short", name: "Ada" }]) expect(authSchema.safeParse(data).success).toBe(false); });
});
describe("authorization", () => {
  const identity = { id: "owner", email: "owner@example.com" };
  const roles = [{ id: "assignment", userId: "owner", role: "learner" as const, workspaceId: null }];
  it("requires authenticated ownership", () => { expect(ownsProfile(null, "owner")).toBe(false); expect(ownsProfile(identity, "other")).toBe(false); expect(ownsProfile(identity, "owner")).toBe(true); });
  it("limits role activation to assignments owned by the session", () => { expect(canActivateRole(identity, roles, "assignment")).toBe(true); expect(canActivateRole({ ...identity, id: "other" }, roles, "assignment")).toBe(false); expect(canActivateRole(identity, roles, "admin")).toBe(false); });
  it("respects public/private visibility", () => { expect(canReadProfile(null, "owner", "private")).toBe(false); expect(canReadProfile(identity, "owner", "private")).toBe(true); expect(canReadProfile(null, "owner", "public")).toBe(true); });
});
