import { describe, expect, it } from "vitest";
import { canTransition, canWithdraw, deadlineState, evaluateEligibility, filterOpportunities, parseOpportunityQuery, validateAnswers } from "@/lib/marketplace/domain";
import { seededOpportunities } from "@/lib/marketplace/seed";
import type { AccountProfile } from "@/lib/account-types";

const profile = { learnerSegment: "student", educationLevel: "undergraduate", graduationYear: "2027", skills: ["TypeScript"], fullName: "Learner", email: "learner@example.com", city: "Bengaluru", resumeName: "resume.pdf" } as AccountProfile;
describe("opportunity queries", () => {
  it("normalizes allowlisted filters and bounds pagination", () => { const query = parseOpportunityQuery({ type: "job,INVALID", mode: ["remote", "bogus"], page: "-2", pageSize: "999", q: "  React " }); expect(query).toMatchObject({ types: ["job"], modes: ["remote"], page: 1, pageSize: 24, q: "React" }); });
  it("filters published records with deterministic ordering and pagination", () => { const query = parseOpportunityQuery({ type: "job", skill: "typescript", deadline: "all" }); const result = filterOpportunities(seededOpportunities(), query, profile, new Date("2026-10-02")); expect(result.total).toBe(1); expect(result.items[0].slug).toBe("frontend-engineer-buildora"); expect(result.items.every(item => item.status === "published")).toBe(true); });
  it("does not publicly expose closed opportunities", () => { const result = filterOpportunities(seededOpportunities(), parseOpportunityQuery({ deadline: "all", pageSize: "24" }), profile); expect(result.items.every(item => item.status === "published")).toBe(true); });
});
describe("eligibility and deadlines", () => {
  it("uses published rules and explains missing skills safely", () => { const job = seededOpportunities().find(item => item.type === "job")!; expect(evaluateEligibility(job, profile).eligible).toBe(true); expect(evaluateEligibility(job, { ...profile, skills: [] })).toEqual({ eligible: false, reasons: ["Add one of the required skills to your profile."] }); });
  it("evaluates UTC deadlines consistently", () => { const job = seededOpportunities().find(item => item.type === "job")!; expect(deadlineState(job, new Date("2027-12-31T23:59:58Z"))).toBe("upcoming"); expect(deadlineState(job, new Date("2028-01-01T00:00:00Z"))).toBe("closed"); });
});
describe("applications", () => {
  const internship = seededOpportunities().find(item => item.type === "internship")!;
  it("validates required questions, options, and URLs", () => { expect(validateAnswers(internship.questions, {})).toHaveProperty("case-study"); expect(validateAnswers(internship.questions, { "case-study": "nope", availability: "Now" })).toHaveProperty("case-study"); expect(validateAnswers(internship.questions, { "case-study": "https://example.com", availability: "Now" })).toEqual({}); });
  it("allows only configured state transitions", () => { expect(canTransition("draft", "submitted")).toBe(true); expect(canTransition("submitted", "accepted")).toBe(true); expect(canTransition("accepted", "reviewing")).toBe(false); });
  it("enforces withdrawal status, policy, and deadline", () => { const application = { status: "submitted" } as Parameters<typeof canWithdraw>[0]; expect(canWithdraw(application, internship, new Date("2026-10-02"))).toBe(true); expect(canWithdraw({ ...application, status: "accepted" }, internship, new Date("2026-10-02"))).toBe(false); });
});
