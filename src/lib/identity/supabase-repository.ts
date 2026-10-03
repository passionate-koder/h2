import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "./http";
import type { AccountRepository } from "./repository";
import type { AccountProfile, AccountStore } from "@/lib/account-types";
export function createSupabaseRepository(client: SupabaseClient): AccountRepository {
  const repository: AccountRepository = {
    async read(identity) {
      const { data, error } = await client.from("profiles").select("data,legacy_state,active_role_assignment_id").eq("id", identity.id).single();
      if (error || !data) throw new Error("Profile read failed.");
      return { ...data.legacy_state, profile: { ...data.data, uid: identity.id, email: identity.email } as AccountProfile, activeRoleAssignmentId: data.active_role_assignment_id || undefined } as AccountStore;
    },
    async update(identity, update) {
      const previous = await repository.read(identity);
      const account = update(previous);
      const { error } = await client.rpc("save_account", { profile_data: account.profile, legacy_data: { registrations: account.registrations, hostInquiries: account.hostInquiries || [] }, expected_updated_at: previous.profile.updatedAt });
      if (error?.code === "40001") throw new HttpError("Your profile changed in another session. Refresh and try again.", 409);
      if (error) throw new Error("Profile update failed.");
      return repository.read(identity);
    },
    async history(identity) {
      const [education, experience, project] = await Promise.all([
        client.from("educations").select("id,institution,qualification,start_date,end_date").eq("user_id", identity.id),
        client.from("experiences").select("id,organization,title,start_date,end_date").eq("user_id", identity.id),
        client.from("projects").select("id,title,description,url").eq("user_id", identity.id),
      ]);
      if (education.error || experience.error || project.error) throw new Error("Profile history read failed.");
      return {
        educations: (education.data || []).map(e => ({ id: e.id, institution: e.institution, qualification: e.qualification, startDate: e.start_date || undefined, endDate: e.end_date || undefined })),
        experiences: (experience.data || []).map(e => ({ id: e.id, organization: e.organization, title: e.title, startDate: e.start_date || undefined, endDate: e.end_date || undefined })),
        projects: (project.data || []).map(e => ({ id: e.id, title: e.title, description: e.description, url: e.url || undefined })),
      };
    },
    async audit(identity) {
      const { data, error } = await client.from("audit_events").select("id,user_id,action,created_at").eq("user_id", identity.id).order("created_at", { ascending: false }).limit(100);
      if (error) throw new Error("Audit read failed.");
      return (data || []).map(e => ({ id: e.id, userId: e.user_id, action: e.action, createdAt: e.created_at }));
    },
    async roles(identity) {
      const { data, error } = await client.from("role_assignments").select("id,user_id,role,workspace_id").eq("user_id", identity.id);
      if (error) throw new Error("Role read failed.");
      return (data || []).map(a => ({ id: a.id, userId: a.user_id, role: a.role, workspaceId: a.workspace_id }));
    },
    async activateRole(_identity, assignmentId) {
      const { error } = await client.rpc("activate_role", { assignment_id: assignmentId });
      if (error) throw new Error("Role change failed.");
    },
  };
  return repository;
}
