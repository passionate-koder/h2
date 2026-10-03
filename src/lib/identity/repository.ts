import type { AccountStore, LearnerHistory, AuditEvent } from "@/lib/account-types";
import type { Identity, RoleAssignment } from "./authorization";
export interface AccountRepository {
  read(identity: Identity): Promise<AccountStore>;
  update(identity: Identity, update: (account: AccountStore) => AccountStore): Promise<AccountStore>;
  history(identity: Identity): Promise<LearnerHistory>;
  audit(identity: Identity): Promise<AuditEvent[]>;
  roles(identity: Identity): Promise<RoleAssignment[]>;
  activateRole(identity: Identity, assignmentId: string): Promise<void>;
}
export type { Education, Experience, Project, AuditEvent, LearnerHistory, ProfileVisibility, NotificationPreferences } from "@/lib/account-types";
