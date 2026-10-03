import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { HttpError } from "@/lib/identity/http";
import { identityConfig } from "@/lib/identity/config";
import type { Identity } from "@/lib/identity/authorization";

export type Role = "owner" | "billing_admin" | "hiring_manager" | "event_manager" | "evaluator" | "content_editor" | "analyst" | "viewer";
export type Organization = { id: string; legalName: string; name: string; slug: string; type: "employer" | "organizer" | "college" | "NGO" | "partner"; country: string; jurisdiction: string; registrationId?: string; address?: string; website?: string; description?: string; verified: boolean; createdAt: string; updatedAt: string };
export type Member = { id: string; organizationId: string; userId?: string; email: string; role: Role; status: "invited" | "accepted"; token?: string; invitedAt: string; acceptedAt?: string; updatedAt: string };
export type Evidence = { id: string; category: string; filename: string; mimeType: string; size: number; storagePath: string; uploaderId: string; createdAt: string };
export type Verification = { id: string; organizationId: string; state: "draft" | "submitted" | "in_review" | "approved" | "rejected" | "needs_changes"; evidence: Evidence[]; submittedAt?: string; reviewedAt?: string; reviewerId?: string; reason?: string; updatedAt: string };
export type Audit = { id: string; actorId: string; action: string; subjectId: string; before?: string; after?: string; reason?: string; at: string };
export type Criterion = { id: string; name: string; max: number };
export type Competition = { id: string; organizationId: string; slug: string; title: string; description: string; format: "online" | "in-person" | "hybrid"; location?: string; registrationOpensAt: string; registrationClosesAt: string; startsAt: string; endsAt: string; teamDeadline: string; submissionDeadline: string; capacity: number; minTeamSize: number; maxTeamSize: number; eligibility?: string; eligibleRoles?: ("student"|"professional")[]; problemStatements: string[]; prizes: string[]; faqs: string[]; resources: string[]; rounds: { id:string; name:string; type:string; opensAt:string; closesAt:string }[]; criteria: Criterion[]; state: "draft" | "published" | "results_published"; createdAt: string; updatedAt: string };
export type Registration = { id:string; competitionId:string; userId:string; attendance?:"online"|"in-person"; at:string; reference:string };
export type Team = { id:string; competitionId:string; name:string; creatorId:string; members:string[]; invites:{email:string;token:string}[]; at:string };
export type Submission = { id:string; competitionId:string; teamId:string; problemIndex:number; name:string; description:string; repositoryUrl?:string; demoUrl?:string; assetPath?:string; at:string; reference:string };
export type Score = { id:string; submissionId:string; judgeId:string; criterionId:string; value:number; feedback?:string; state:"draft"|"final"; at:string };
export type Question = { id:string; prompt:string; type:"single"|"multi"; options:{id:string;text:string}[]; correct:string[]; points:number };
export type Assessment = { id:string; competitionId:string; title:string; instructions:string; disclosure:string; durationSeconds:number; maxAttempts:number; opensAt:string; closesAt:string; published:boolean; questions:Question[]; createdAt:string };
export type Attempt = { id:string; assessmentId:string; userId:string; number:number; startedAt:string; consentedAt:string; expiresAt:string; state:"active"|"submitted"|"expired"; questionOrder:string[]; optionOrders:Record<string,string[]>; answers:Record<string,string[]>; score?:number; submittedAt?:string; reference?:string; updatedAt:string };
export type Store = { organizations: Organization[]; members: Member[]; verifications: Verification[]; competitions: Competition[]; registrations: Registration[]; teams: Team[]; submissions: Submission[]; assignments:{id:string;submissionId:string;judgeId:string;at:string}[]; scores:Score[]; assessments:Assessment[]; attempts:Attempt[]; integrityEvents:{id:string;attemptId:string;userId:string;type:string;at:string}[]; audit: Audit[] };
const file = path.join(path.resolve(process.env.BUILDORA_LOCAL_DATA_DIR || ".local-data"), "events.json");
let lock = Promise.resolve();
export const now = () => new Date().toISOString();
export const empty = (): Store => ({ organizations: [], members: [], verifications: [], competitions: [], registrations: [], teams: [], submissions: [], assignments: [], scores: [], assessments: [], attempts: [], integrityEvents: [], audit: [] });
export function localOnly() { if (identityConfig().mode !== "local") throw new HttpError("Organization workflows require a configured database migration.", 503); }
export async function read(): Promise<Store> { localOnly(); try { return { ...empty(), ...JSON.parse(await fs.readFile(file, "utf8")) }; } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return empty(); throw e; } }
export async function mutate<T>(fn: (store: Store) => T): Promise<T> {
  localOnly(); let result!: T;
  const operation = lock.then(async () => { const data = await read(); result = fn(data); await fs.mkdir(path.dirname(file), { recursive: true }); const temp = `${file}.${randomUUID()}.tmp`; await fs.writeFile(temp, JSON.stringify(data, null, 2), { mode: 0o600 }); await fs.rename(temp, file); });
  lock = operation.catch(() => undefined); await operation; return result;
}
export function required(identity: Identity | null): Identity { if (!identity) throw new HttpError("Please sign in.", 401); return identity; }
export function member(store: Store, identity: Identity, organizationId: string, roles?: Role[]) { const m = store.members.find(x => x.organizationId === organizationId && x.userId === identity.id && x.status === "accepted"); if (!m || (roles && !roles.includes(m.role))) throw new HttpError("You do not have access to this organization.", 403); return m; }
export function admin(identity: Identity) { const emails = (process.env.BUILDORA_REVIEWER_EMAILS || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean); if (!emails.includes(identity.email.toLowerCase())) throw new HttpError("Admin access required.", 403); }
export function audit(store: Store, identity: Identity, action: string, subjectId: string, before?: string, after?: string, reason?: string) { store.audit.push({ id: randomUUID(), actorId: identity.id, action, subjectId, before, after, reason, at: now() }); }
