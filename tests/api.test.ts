import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ identity: null as null | { id: string; email: string }, update: vi.fn(), activate: vi.fn() }));
vi.mock("@/lib/accounts", () => ({
  getIdentity: async () => mocks.identity,
  updateAccount: mocks.update, activateRole: mocks.activate,
  validOrigin: (request: Request) => !request.headers.get("origin") || request.headers.get("origin") === new URL(request.url).origin,
}));
import { PATCH } from "@/app/api/profile/route";
import { POST as workspace } from "@/app/api/workspace/route";
import { POST as onboarding } from "@/app/api/onboarding/route";
function request(body: unknown, method = "PATCH") { return new Request("http://localhost:3100/api/profile", { method, body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }); }
beforeEach(() => { mocks.identity = null; mocks.update.mockReset(); mocks.activate.mockReset(); });
it("rejects private operations before accessing persistence", async () => { expect((await PATCH(request({ fullName: "Ada" }))).status).toBe(401); expect((await workspace(request({ assignmentId: "admin" }, "POST"))).status).toBe(401); expect(mocks.update).not.toHaveBeenCalled(); });
it("rejects malformed JSON, types and cross-origin updates", async () => {
  mocks.identity = { id: "owner", email: "a@b.com" };
  expect((await PATCH(new Request("http://localhost:3100/api/profile", { method: "PATCH", body: "{" }))).status).toBe(400);
  expect((await PATCH(request({ fullName: 123 }))).status).toBe(400);
  expect((await PATCH(new Request("http://localhost:3100/api/profile", { method: "PATCH", headers: { origin: "https://evil.example" }, body: "{}" }))).status).toBe(403);
  expect((await onboarding(request({ learnerSegment: "admin" }, "POST"))).status).toBe(400);
});
it("uses the session identity and strips injected owner/role fields", async () => {
  mocks.identity = { id: "owner", email: "a@b.com" };
  mocks.update.mockImplementation(async (_identity, mutate) => mutate({ profile: { uid: "owner", role: "student", fullName: "Original" }, registrations: [] }));
  const response = await PATCH(request({ uid: "victim", role: "admin", fullName: "Ada" }));
  expect(response.status).toBe(200); expect((await response.json()).user).toMatchObject({ uid: "owner", role: "student", fullName: "Ada" });
  expect(mocks.update.mock.calls[0][0].id).toBe("owner");
});
it("rejects role payloads containing browser-supplied owner/workspace fields", async () => {
  mocks.identity = { id: "owner", email: "a@b.com" };
  expect((await workspace(request({ assignmentId: "x", userId: "victim", role: "admin" }, "POST"))).status).toBe(400);
  expect(mocks.activate).not.toHaveBeenCalled();
});
it("returns safe errors without leaking upstream details", async () => {
  mocks.identity = { id: "owner", email: "a@b.com" }; mocks.update.mockRejectedValue(new Error("secret-token"));
  const response = await PATCH(request({ fullName: "Ada" })); expect(response.status).toBe(500); expect(JSON.stringify(await response.json())).not.toContain("secret-token"); expect(response.headers.get("Cache-Control")).toBe("no-store");
});
