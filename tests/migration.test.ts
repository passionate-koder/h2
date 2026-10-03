import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, expect, it } from "vitest";
const db = new PGlite();
const owner = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
async function asUser(id: string, sql: string) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${id}',false)`);
  try { return await db.query(sql); } finally { await db.exec("reset role"); }
}
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
    insert into auth.users(id,email) values ('${owner}','owner@example.com');`);
  await db.exec(await readFile("supabase/migrations/202610020001_identity.sql", "utf8"));
  await db.exec(`insert into auth.users(id,email) values ('${other}','other@example.com')`);
}, 30000);
afterAll(async () => { await db.close(); });
it("applies the migration and provisions both existing and new identities", async () => {
  expect((await db.query("select * from public.profiles")).rows).toHaveLength(2);
  expect((await asUser(owner, "select * from public.profiles")).rows).toHaveLength(1);
  expect((await asUser(other, "select * from public.role_assignments")).rows).toHaveLength(1);
});
it("prevents direct role, audit, preference and profile changes", async () => {
  for (const sql of ["update public.profiles set data='{}'", "insert into public.role_assignments(user_id,role) values ('" + owner + "','admin')", "delete from public.audit_events", "update public.notification_preferences set promotional=true"]) await expect(asUser(other, sql)).rejects.toThrow();
});
it("makes role activation enforce authenticated assignment ownership", async () => {
  const result = await db.query<{id: string}>(`select id from public.role_assignments where user_id='${owner}'`);
  const assignment = result.rows[0].id;
  await expect(asUser(other, `select public.activate_role('${assignment}')`)).rejects.toThrow("Role unavailable");
  await asUser(owner, `select public.activate_role('${assignment}')`);
});
it("saves only the caller profile, preserves identity and retracts public data when private", async () => {
  await asUser(owner, `select public.save_account('{"uid":"${other}","role":"admin","fullName":"Ada","city":"Paris","skills":["TS"],"visibility":"public"}', '{"registrations":[]}', (select data->>'updatedAt' from public.profiles))`);
  const result = await asUser(owner, "select data from public.profiles");
  expect((result.rows[0] as { data: { uid: string; role: string } }).data).toMatchObject({ uid: owner, role: "student" });
  await db.exec("set role anon");
  expect((await db.query("select full_name from public.public_profiles")).rows).toEqual([{ full_name: "Ada" }]);
  await expect(db.query("select * from public.profiles")).rejects.toThrow(); await db.exec("reset role");
  await asUser(owner, `select public.save_account('{"visibility":"private"}', '{"registrations":[]}', (select data->>'updatedAt' from public.profiles))`);
  expect((await db.query("select * from public.public_profiles")).rows).toHaveLength(0);
  const otherResult = await asUser(other, "select data from public.profiles");
  expect((otherResult.rows[0] as { data: { fullName: string } }).data.fullName).toBe("Learner");
});
it("protects child entities with owner RLS", async () => {
  await asUser(owner, `insert into public.projects(user_id,title) values ('${owner}','Project')`);
  expect((await asUser(other, "select * from public.projects")).rows).toHaveLength(0);
  await expect(asUser(other, `insert into public.projects(user_id,title) values ('${owner}','Injected')`)).rejects.toThrow();
});

it("rejects stale aggregate writes and anonymous role RPCs", async () => {
  await expect(asUser(owner, `select public.save_account('{}','{}','stale')`)).rejects.toThrow("Concurrent profile change");
  await db.exec("set role anon");
  try { await expect(db.query(`select public.activate_role('00000000-0000-4000-8000-000000000001')`)).rejects.toThrow(); }
  finally { await db.exec("reset role"); }
});
