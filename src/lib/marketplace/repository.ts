import "server-only";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { AccountProfile } from "@/lib/account-types";
import type { Identity } from "@/lib/identity/authorization";
import { HttpError } from "@/lib/identity/http";
import { identityConfig } from "@/lib/identity/config";
import { supabaseServer } from "@/lib/supabase/server";
import { seededOpportunities } from "./seed";
import { canTransition, canWithdraw, deadlineState, evaluateEligibility, filterOpportunities, validateAnswers } from "./domain";
import type { Application, ApplicationStatus, MarketplaceStore, Opportunity, OpportunityQuery } from "./types";

const root = path.resolve(process.env.HC_LOCAL_DATA_DIR || ".local-data");
const storeFile = path.join(root, "marketplace.json");
let lock = Promise.resolve();
const emptyStore = (): MarketplaceStore => ({ saved: [], applications: [] });
async function readLocal(): Promise<MarketplaceStore> {
  try { return { ...emptyStore(), ...JSON.parse(await fs.readFile(storeFile, "utf8")) }; }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; return emptyStore(); }
}
async function writeLocal(update: (store: MarketplaceStore) => MarketplaceStore) {
  let result!: MarketplaceStore;
  const operation = lock.then(async () => {
    await fs.mkdir(root, { recursive: true }); result = update(await readLocal());
    const temporary = `${storeFile}.${randomUUID()}.tmp`; await fs.writeFile(temporary, JSON.stringify(result, null, 2), { mode: 0o600 }); await fs.rename(temporary, storeFile);
  }); lock = operation.catch(() => undefined); await operation; return result;
}
function publicOpportunity(slug: string) { return seededOpportunities().find(o => o.slug === slug && o.status === "published") || null; }
async function localOpportunities() {
  const seeds = seededOpportunities();
  try { const imported = JSON.parse(await fs.readFile(path.join(root, "opportunities-import.json"), "utf8")) as Opportunity[]; const bySlug = new Map(seeds.map(o => [o.slug, o])); for (const item of imported) bySlug.set(item.slug, item); return [...bySlug.values()]; }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; return seeds; }
}
function localEmployerOrganizations(identity: Identity) { return identity.localRole === "professional" ? ["30000000-0000-4000-8000-000000000001"] : []; }
function assertEmployer(identity: Identity, opportunity: Opportunity) { if (!localEmployerOrganizations(identity).includes(opportunity.organization.id)) throw new HttpError("You do not have access to this organization.", 403); }
function sanitize(application: Application): Application { const safe = { ...application }; delete safe.notes; return safe; }
function receipt() { return `BLD-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`; }

async function cloudRpc<T>(name: string, args: Record<string, unknown> = {}) {
  const { data, error } = await (await supabaseServer()).rpc(name, args);
  if (error) throw new HttpError(error.message.includes("access") ? "You do not have access." : error.message, error.message.includes("access") ? 403 : 400);
  return data as T;
}
function cloud() { return identityConfig().mode === "supabase"; }

export async function searchOpportunities(query: OpportunityQuery, profile?: AccountProfile | null) {
  if (!cloud()) return filterOpportunities(await localOpportunities(), query, profile);
  return cloudRpc<ReturnType<typeof filterOpportunities>>("search_opportunities", { filters: query, profile_data: profile ? { learnerSegment: profile.learnerSegment, educationLevel: profile.educationLevel, graduationYear: profile.graduationYear, skills: profile.skills } : null });
}
export async function getOpportunity(slug: string): Promise<Opportunity | null> {
  if (!cloud()) return (await localOpportunities()).find(o => o.slug === slug && o.status === "published") || null;
  return cloudRpc<Opportunity | null>("get_public_opportunity", { opportunity_slug: slug });
}
export async function savedOpportunityIds(identity: Identity) {
  if (cloud()) return cloudRpc<string[]>("saved_opportunity_ids");
  return (await readLocal()).saved.filter(s => s.userId === identity.id).map(s => s.opportunityId);
}
export async function setSaved(identity: Identity, slug: string, saved: boolean) {
  const opportunity = await getOpportunity(slug); if (!opportunity) throw new HttpError("Opportunity not found.", 404);
  if (cloud()) return cloudRpc<{ saved: boolean }>("set_saved_opportunity", { p_opportunity_id: opportunity.id, should_save: saved });
  await writeLocal(store => ({ ...store, saved: saved ? [...store.saved.filter(s => s.userId !== identity.id || s.opportunityId !== opportunity.id), { userId: identity.id, opportunityId: opportunity.id, createdAt: new Date().toISOString() }] : store.saved.filter(s => s.userId !== identity.id || s.opportunityId !== opportunity.id) }));
  return { saved };
}
export async function listMyApplications(identity: Identity): Promise<Application[]> {
  if (cloud()) return cloudRpc<Application[]>("my_applications");
  return (await readLocal()).applications.filter(a => a.applicantId === identity.id).map(sanitize).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function getMyApplication(identity: Identity, id: string): Promise<Application | null> {
  if (cloud()) return cloudRpc<Application | null>("my_application", { p_application_id: id });
  const application = (await readLocal()).applications.find(a => a.id === id && a.applicantId === identity.id); return application ? sanitize(application) : null;
}
export async function saveApplication(identity: Identity, profile: AccountProfile, slug: string, answers: Record<string, string>, submit: boolean) {
  const opportunity = await getOpportunity(slug);
  if (!opportunity || !["job", "internship"].includes(opportunity.type)) throw new HttpError("Applications are unavailable for this opportunity.", 400);
  if (deadlineState(opportunity) === "closed") throw new HttpError("This opportunity is no longer accepting applications.", 400);
  const eligibility = evaluateEligibility(opportunity, profile); if (!eligibility.eligible) throw new HttpError(eligibility.reasons[0], 400);
  const validation = validateAnswers(opportunity.questions, answers); if (submit && Object.keys(validation).length) throw new HttpError(Object.values(validation)[0], 400);
  const snapshot = { fullName: profile.fullName, email: profile.email, city: profile.city, skills: profile.skills, educationLevel: profile.educationLevel, experienceLevel: profile.experienceLevel, learnerSegment: profile.learnerSegment, graduationYear: profile.graduationYear, resumeName: profile.resumeName };
  if (cloud()) return cloudRpc<Application>("save_application", { p_opportunity_id: opportunity.id, answer_data: answers, should_submit: submit, profile_snapshot: snapshot });
  let result!: Application;
  await writeLocal(store => {
    const existing = store.applications.find(a => a.opportunityId === opportunity.id && a.applicantId === identity.id);
    if (existing && existing.status !== "draft") { result = sanitize(existing); return store; }
    const now = new Date().toISOString(); const status: ApplicationStatus = submit ? "submitted" : "draft";
    if (existing) { existing.answers = answers; existing.profileSnapshot = snapshot; existing.updatedAt = now; if (submit) { existing.status = status; existing.submittedAt = now; existing.history.push({ id: randomUUID(), previousStatus: "draft", newStatus: "submitted", actorId: identity.id, createdAt: now }); } result = sanitize(existing); return store; }
    const application: Application = { id: randomUUID(), reference: receipt(), opportunityId: opportunity.id, opportunitySlug: opportunity.slug, opportunityTitle: opportunity.title, applicantId: identity.id, status, answers, profileSnapshot: snapshot, submittedAt: submit ? now : undefined, createdAt: now, updatedAt: now, history: [{ id: randomUUID(), previousStatus: null, newStatus: status, actorId: identity.id, createdAt: now }], notes: [] };
    store.applications.push(application); result = sanitize(application); return store;
  }); return result;
}
export async function withdrawApplication(identity: Identity, id: string) {
  if (cloud()) return cloudRpc<Application>("withdraw_application", { p_application_id: id });
  let result!: Application;
  await writeLocal(store => { const application = store.applications.find(a => a.id === id && a.applicantId === identity.id); if (!application) throw new HttpError("Application not found.", 404); const opportunity = publicOpportunity(application.opportunitySlug); if (!opportunity || !canWithdraw(application, opportunity)) throw new HttpError("This application cannot be withdrawn.", 400); const now = new Date().toISOString(); application.history.push({ id: randomUUID(), previousStatus: application.status, newStatus: "withdrawn", actorId: identity.id, createdAt: now }); application.status = "withdrawn"; application.withdrawnAt = now; application.updatedAt = now; result = sanitize(application); return store; }); return result;
}
export async function employerApplications(identity: Identity, slug: string, status?: ApplicationStatus) {
  const opportunity = seededOpportunities().find(o => o.slug === slug); if (!opportunity) throw new HttpError("Opportunity not found.", 404);
  if (cloud()) return cloudRpc<Application[]>("employer_applications", { opportunity_slug: slug, status_filter: status || null });
  assertEmployer(identity, opportunity); return (await readLocal()).applications.filter(a => a.opportunityId === opportunity.id && a.status !== "draft" && (!status || a.status === status));
}
export async function updateApplicationStatus(identity: Identity, id: string, status: ApplicationStatus, reason?: string) {
  if (cloud()) return cloudRpc<Application>("update_application_status", { p_application_id: id, next_status: status, status_reason: reason || null });
  let result!: Application;
  await writeLocal(store => { const application = store.applications.find(a => a.id === id); if (!application || application.status === "draft") throw new HttpError("Application not found.", 404); const opportunity = seededOpportunities().find(o => o.id === application.opportunityId)!; assertEmployer(identity, opportunity); if (!canTransition(application.status, status) || status === "withdrawn") throw new HttpError("Invalid application status transition.", 400); const now = new Date().toISOString(); application.history.push({ id: randomUUID(), previousStatus: application.status, newStatus: status, actorId: identity.id, reason, createdAt: now }); application.status = status; application.updatedAt = now; result = application; return store; }); return result;
}
export async function addEmployerNote(identity: Identity, id: string, body: string) {
  if (cloud()) return cloudRpc<Application>("add_employer_note", { p_application_id: id, note_body: body });
  let result!: Application;
  await writeLocal(store => { const application = store.applications.find(a => a.id === id && a.status !== "draft"); if (!application) throw new HttpError("Application not found.", 404); assertEmployer(identity, seededOpportunities().find(o => o.id === application.opportunityId)!); application.notes ||= []; application.notes.push({ id: randomUUID(), authorId: identity.id, body, createdAt: new Date().toISOString() }); result = application; return store; }); return result;
}
export async function employerCsv(identity: Identity, slug: string) {
  const applications = (await employerApplications(identity, slug)).slice(0, 5000);
  const cell = (value: unknown) => '"' + String(value ?? "").replaceAll('"', '""').replace(/^[=+\-@]/, "'$&") + '"';
  return [["reference", "status", "submitted_at", "name", "email", "city", "skills"], ...applications.map(a => [a.reference, a.status, a.submittedAt || "", a.profileSnapshot.fullName, a.profileSnapshot.email, a.profileSnapshot.city, a.profileSnapshot.skills.join("; ")])].map(row => row.map(cell).join(",")).join("\r\n");
}
