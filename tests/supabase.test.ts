import { expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseRepository } from "@/lib/identity/supabase-repository";
it("uses verified identity for queries and owner-derived RPC mutations", async () => {
  const single = vi.fn().mockResolvedValue({ data: { data: { fullName: "Ada" }, legacy_state: { registrations: [] } }, error: null });
  const eq = vi.fn().mockReturnValue({ single }); const select = vi.fn().mockReturnValue({ eq });
  const client = { from: vi.fn().mockReturnValue({ select }), rpc: vi.fn().mockResolvedValue({ error: null }) };
  const repository = createSupabaseRepository(client as unknown as SupabaseClient);
  const identity = { id: "owner", email: "owner@example.com" };
  await repository.update(identity, a => ({ ...a, profile: { ...a.profile, city: "Paris" } }));
  expect(eq).toHaveBeenCalledWith("id", "owner");
  expect(client.rpc).toHaveBeenCalledWith("save_account", expect.objectContaining({ profile_data: expect.objectContaining({ uid: "owner", city: "Paris" }) }));
  expect(client.rpc.mock.calls[0][1]).not.toHaveProperty("user_id");
});
it("surfaces storage failures instead of returning seeded or fake cloud data", async () => {
  const client = { from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ error: { message: "failure" } }) }) }) }) };
  await expect(createSupabaseRepository(client as unknown as SupabaseClient).read({ id: "owner", email: "a@b.com" })).rejects.toThrow("Profile read failed");
});

it("reads structured history through owner-scoped table queries", async () => {
  const eq = vi.fn().mockResolvedValue({ data: [], error: null });
  const client = { from: vi.fn().mockReturnValue({ select: () => ({ eq }) }) };
  const history = await createSupabaseRepository(client as unknown as SupabaseClient).history({ id: "owner", email: "a@b.com" });
  expect(history).toEqual({ educations: [], experiences: [], projects: [] });
  expect(eq).toHaveBeenCalledTimes(3); expect(eq).toHaveBeenCalledWith("user_id", "owner");
});
