import "server-only";
import * as local from "./local-accounts";
import { identityConfig } from "./identity/config";
import { localRepository } from "./identity/local-repository";
import { createSupabaseRepository } from "./identity/supabase-repository";
import { supabaseServer } from "./supabase/server";
import type { Identity } from "./identity/authorization";
import { canActivateRole, ownsProfile } from "./identity/authorization";
import type { AccountStore } from "./account-types";
import { HttpError } from "./identity/http";
import { logEvent } from "./identity/logger";
let logged = false;
export function authMode() { const mode = identityConfig().mode; if (!logged) { logEvent("identity.mode", { mode }); logged = true; } return mode; }
export async function getIdentity(): Promise<Identity | null> {
  if (authMode() === "local") { const role = await local.getAccountRole(); if (!role) return null; const p = local.seedProfile(role); return { id: p.uid, email: p.email, localRole: role }; }
  const { data, error } = await (await supabaseServer()).auth.getUser();
  return !error && data.user ? { id: data.user.id, email: data.user.email || "" } : null;
}
export async function signIn(email: string, password: string) {
  if (authMode() === "local") { if (!await local.signIn(email, password)) return null; return getIdentity(); }
  const { error } = await (await supabaseServer()).auth.signInWithPassword({ email, password });
  return error ? null : getIdentity();
}
export async function signOut() {
  if (authMode() === "local") return local.signOut();
  const { error } = await (await supabaseServer()).auth.signOut();
  if (error) throw new Error("Sign out failed.");
}
async function repository(identity: Identity) {
  const current = await getIdentity();
  if (!ownsProfile(current, identity.id) || current?.localRole !== identity.localRole) throw new HttpError("Please sign in.", 401);
  return authMode() === "local" ? localRepository : createSupabaseRepository(await supabaseServer());
}
export async function readAccount(identity: Identity) { return (await repository(identity)).read(identity); }
export async function updateAccount(identity: Identity, update: (account: AccountStore) => AccountStore) { return (await repository(identity)).update(identity, update); }
export async function readProfileHistory(identity: Identity) { return (await repository(identity)).history(identity); }
export async function readAuditEvents(identity: Identity) { return (await repository(identity)).audit(identity); }
export async function activateRole(identity: Identity, assignmentId: string) {
  const repo = await repository(identity);
  if (!canActivateRole(identity, await repo.roles(identity), assignmentId)) throw new HttpError("This role is unavailable.", 403);
  await repo.activateRole(identity, assignmentId);
}
export { validOrigin } from "./local-accounts";

// Compatibility alias for existing callers; this now returns a verified identity.
export const getAccountRole = getIdentity;
