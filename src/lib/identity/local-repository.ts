import "server-only";
import { readAccount, updateAccount } from "@/lib/local-accounts";
import type { AccountRepository } from "./repository";
import type { Identity } from "./authorization";
import { randomUUID } from "node:crypto";
function role(identity: Identity) { if (!identity.localRole) throw new Error("Invalid local identity."); return identity.localRole; }
export const localRepository: AccountRepository = {
  read: identity => readAccount(role(identity)),
  update: (identity, update) => updateAccount(role(identity), account => ({ ...update(account), auditEvents: [...(account.auditEvents || []), { id: randomUUID(), userId: identity.id, action: "account.updated", createdAt: new Date().toISOString() }] })),
  history: async identity => (await readAccount(role(identity))).history || { educations: [], experiences: [], projects: [] },
  audit: async identity => (await readAccount(role(identity))).auditEvents || [],
  roles: async identity => [{ id: `local-${role(identity)}`, userId: identity.id, role: "learner", workspaceId: null }],
  activateRole: async (identity, assignmentId) => { if (assignmentId !== `local-${role(identity)}`) throw new Error("Invalid role assignment."); await localRepository.update(identity, a => ({ ...a, activeRoleAssignmentId: assignmentId })); },
};
