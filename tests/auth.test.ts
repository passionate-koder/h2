import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ mode: "local", identity: null as null | { id: string; email: string }, signup: vi.fn(), reset: vi.fn(), resend: vi.fn(), update: vi.fn(), exchange: vi.fn(), verify: vi.fn(), logout: vi.fn() }));
vi.mock("@/lib/accounts", () => ({ authMode: () => mocks.mode, getIdentity: async () => mocks.identity, readAccount: vi.fn(), signIn: vi.fn(), signOut: mocks.logout, validOrigin: () => true }));
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: async () => ({ auth: { signUp: mocks.signup, resetPasswordForEmail: mocks.reset, resend: mocks.resend, updateUser: mocks.update, exchangeCodeForSession: mocks.exchange, verifyOtp: mocks.verify } }) }));
vi.mock("@/lib/identity/config", () => ({ identityConfig: () => ({ mode: mocks.mode, siteUrl: "https://buildora.example" }) }));
import { POST } from "@/app/api/auth/route";
import { GET } from "@/app/auth/callback/route";
let sequence = 0;
function request(action: string, fields = {}) { return new Request("https://buildora.example/api/auth", { method: "POST", body: JSON.stringify({ action, email: `user${sequence++}@example.com`, password: "test-password", name: "Ada", ...fields }) }); }
beforeEach(() => { mocks.mode = "local"; mocks.identity = null; for (const fn of [mocks.signup, mocks.reset, mocks.resend, mocks.update, mocks.exchange, mocks.verify, mocks.logout]) fn.mockReset().mockResolvedValue({ error: null }); });
it("makes unavailable local email flows explicit without pretending to send mail", async () => { expect((await POST(request("reset"))).status).toBe(503); expect(mocks.reset).not.toHaveBeenCalled(); });
it("configures signup and recovery with trusted callback origins", async () => {
  mocks.mode = "supabase"; expect((await POST(request("signup"))).status).toBe(200);
  expect(mocks.signup).toHaveBeenCalledWith(expect.objectContaining({ options: expect.objectContaining({ emailRedirectTo: "https://buildora.example/auth/callback" }) }));
  expect((await POST(request("reset"))).status).toBe(200);
  expect(mocks.reset).toHaveBeenCalledWith(expect.any(String), { redirectTo: "https://buildora.example/auth/callback?next=/auth/update-password" });
});
it("uses the same signup message for existing and new accounts", async () => {
  mocks.mode = "supabase"; const fresh = await (await POST(request("signup"))).json();
  mocks.signup.mockResolvedValue({ error: { code: "user_already_exists" } });
  expect(await (await POST(request("signup"))).json()).toEqual(fresh);
});
it("requires a verified server session for password changes and signs out afterward", async () => {
  mocks.mode = "supabase"; expect((await POST(request("update-password"))).status).toBe(401); expect(mocks.update).not.toHaveBeenCalled();
  mocks.identity = { id: "owner", email: "a@b.com" }; expect((await POST(request("update-password"))).status).toBe(200); expect(mocks.logout).toHaveBeenCalled();
});
it("verifies callback codes/OTP and constrains redirects", async () => {
  mocks.mode = "supabase";
  let response = await GET(new Request("https://buildora.example/auth/callback?code=valid&next=https://evil.example"));
  expect(response.headers.get("location")).toBe("https://buildora.example/onboarding");
  response = await GET(new Request("https://buildora.example/auth/callback?token_hash=valid&type=recovery"));
  expect(mocks.verify).toHaveBeenCalledWith({ token_hash: "valid", type: "recovery" });
  expect(response.headers.get("location")).toBe("https://buildora.example/auth/update-password");
  mocks.exchange.mockResolvedValue({ error: { message: "expired" } });
  response = await GET(new Request("https://buildora.example/auth/callback?code=expired"));
  expect(response.headers.get("location")).toBe("https://buildora.example/auth/verify?error=expired");
});
