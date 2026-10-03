import type { AccountRole } from "@/lib/account-types";
export type Identity = { id: string; email: string; localRole?: AccountRole };
export type WorkspaceRole = "learner" | "organizer" | "mentor" | "admin";
export type RoleAssignment = { id: string; userId: string; role: WorkspaceRole; workspaceId: string | null };
export function ownsProfile(identity: Identity | null, ownerId: string) { return !!identity && identity.id === ownerId; }
export function canReadProfile(identity: Identity | null, ownerId: string, visibility: "private" | "public") {
  return visibility === "public" || ownsProfile(identity, ownerId);
}
export function canActivateRole(identity: Identity | null, assignments: RoleAssignment[], assignmentId: string) {
  return !!identity && assignments.some(a => a.id === assignmentId && a.userId === identity.id);
}
