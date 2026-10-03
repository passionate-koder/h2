import { z } from "zod";
import type { AccountProfile } from "@/lib/account-types";
import type { Application, ApplicationQuestion, ApplicationStatus, Opportunity, OpportunityQuery } from "./types";

const opportunityTypes = ["job", "internship", "hackathon", "ngo_challenge", "college_program"] as const;
const workModes = ["remote", "hybrid", "onsite"] as const;
const statuses: ApplicationStatus[] = ["draft", "submitted", "reviewing", "shortlisted", "rejected", "withdrawn", "accepted"];
const transitions: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft: ["submitted"], submitted: ["reviewing", "shortlisted", "rejected", "withdrawn", "accepted"],
  reviewing: ["shortlisted", "rejected", "accepted", "withdrawn"], shortlisted: ["reviewing", "rejected", "accepted", "withdrawn"],
  rejected: [], withdrawn: [], accepted: [],
};

function list(value: string | string[] | undefined, allowed?: readonly string[]) {
  const values = (Array.isArray(value) ? value : value ? value.split(",") : []).map(v => v.trim().toLowerCase()).filter(Boolean).slice(0, 20);
  return allowed ? values.filter(v => allowed.includes(v)) : values;
}
export function parseOpportunityQuery(input: Record<string, string | string[] | undefined>): OpportunityQuery {
  const page = Number(input.page); const pageSize = Number(input.pageSize);
  const compensation = ["paid", "unpaid"].includes(String(input.compensation)) ? input.compensation as "paid" | "unpaid" : "any";
  const eligibility = input.eligibility === "eligible" ? "eligible" : "any";
  const deadline = ["all", "upcoming"].includes(String(input.deadline)) ? input.deadline as "all" | "upcoming" : "open";
  return { q: String(input.q || "").trim().slice(0, 120) || undefined, types: list(input.type, opportunityTypes) as OpportunityQuery["types"], categories: list(input.category), skills: list(input.skill), location: String(input.location || "").trim().slice(0, 120) || undefined, modes: list(input.mode, workModes) as OpportunityQuery["modes"], compensation, duration: String(input.duration || "").trim().slice(0, 80) || undefined, eligibility, deadline, page: Number.isInteger(page) && page > 0 ? Math.min(page, 10000) : 1, pageSize: Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 24) : 12 };
}
export function isPublicOpportunity(opportunity: Opportunity) { return opportunity.status === "published"; }
export function deadlineState(opportunity: Opportunity, now = new Date()) {
  if (opportunity.status !== "published") return "closed" as const;
  if (!opportunity.deadline) return "open" as const;
  const deadline = new Date(opportunity.deadline);
  if (Number.isNaN(deadline.valueOf()) || deadline < now) return "closed" as const;
  return deadline.valueOf() - now.valueOf() <= 7 * 86400000 ? "upcoming" as const : "open" as const;
}
export function evaluateEligibility(opportunity: Opportunity, profile?: AccountProfile | null) {
  if (!profile) return { eligible: false, reasons: ["Sign in and complete your profile to check eligibility."] };
  const rules = opportunity.eligibility; const reasons: string[] = [];
  const includes = (items: string[] | undefined, value?: string) => !items?.length || !!value && items.some(x => x.toLowerCase() === value.toLowerCase());
  if (!includes(rules.learnerSegments, profile.learnerSegment)) reasons.push("Your learner profile does not match the eligible audience.");
  if (!includes(rules.educationLevels, profile.educationLevel)) reasons.push("Your education level does not match this opportunity.");
  if (!includes(rules.graduationYears, profile.graduationYear)) reasons.push("Your graduation year is outside the eligible range.");
  if (rules.requiredSkills?.length && !rules.requiredSkills.some(s => profile.skills.some(p => p.toLowerCase() === s.toLowerCase()))) reasons.push("Add one of the required skills to your profile.");
  return { eligible: reasons.length === 0, reasons };
}
export function filterOpportunities(items: Opportunity[], query: OpportunityQuery, profile?: AccountProfile | null, now = new Date()) {
  const q = query.q?.toLowerCase(); const location = query.location?.toLowerCase();
  const filtered = items.filter(o => isPublicOpportunity(o))
    .filter(o => !q || [o.title, o.summary, o.description, o.organization.name, o.category, ...o.skills].join(" ").toLowerCase().includes(q))
    .filter(o => !query.types.length || query.types.includes(o.type))
    .filter(o => !query.categories.length || query.categories.includes(o.category.toLowerCase()))
    .filter(o => !query.skills.length || query.skills.every(s => o.skills.some(x => x.toLowerCase() === s)))
    .filter(o => !location || [o.location, o.city, o.country].join(" ").toLowerCase().includes(location))
    .filter(o => !query.modes.length || query.modes.includes(o.workMode))
    .filter(o => query.compensation === "any" || (query.compensation === "paid" ? !!o.compensationMaxMinor : !o.compensationMaxMinor))
    .filter(o => !query.duration || o.duration?.toLowerCase().includes(query.duration.toLowerCase()))
    .filter(o => query.eligibility === "any" || evaluateEligibility(o, profile).eligible)
    .filter(o => query.deadline === "all" || deadlineState(o, now) === query.deadline || query.deadline === "open" && deadlineState(o, now) === "upcoming")
    .sort((a, b) => (b.publishedAt || b.createdAt).localeCompare(a.publishedAt || a.createdAt) || a.slug.localeCompare(b.slug));
  const start = (query.page - 1) * query.pageSize;
  return { items: filtered.slice(start, start + query.pageSize), total: filtered.length, page: query.page, pageSize: query.pageSize, pages: Math.max(1, Math.ceil(filtered.length / query.pageSize)) };
}

export const answersSchema = z.record(z.string().max(100), z.string().trim().max(10000)).default({});
export function validateAnswers(questions: ApplicationQuestion[], answers: Record<string, string>) {
  const errors: Record<string, string> = {};
  for (const question of questions.filter(q => q.active)) {
    const value = answers[question.id]?.trim() || "";
    if (question.required && !value) errors[question.id] = `${question.label} is required.`;
    else if (value && question.options.length && !question.options.includes(value)) errors[question.id] = `Choose a valid option for ${question.label}.`;
    else if (value && question.type === "url" && !z.url().safeParse(value).success) errors[question.id] = `Enter a valid URL for ${question.label}.`;
    else if (value && question.type === "number" && !Number.isFinite(Number(value))) errors[question.id] = `Enter a valid number for ${question.label}.`;
  }
  return errors;
}
export function canTransition(from: ApplicationStatus, to: ApplicationStatus) { return statuses.includes(to) && transitions[from].includes(to); }
export function canWithdraw(application: Application, opportunity: Opportunity, now = new Date()) { return opportunity.allowWithdrawal && ["submitted", "reviewing", "shortlisted"].includes(application.status) && deadlineState(opportunity, now) !== "closed"; }
