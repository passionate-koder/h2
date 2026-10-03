import { spawn } from "node:child_process";
import { randomBytes, scryptSync } from "node:crypto";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const profiles = JSON.parse(await fs.readFile("src/content/accounts/profiles.json", "utf8"));
const password = randomBytes(24).toString("hex");
const salt = randomBytes(24).toString("hex");
const hash = salt + ":" + scryptSync(password, salt, 64).toString("hex");
const base = "http://localhost:3100";
const backups = new Map();
for (const file of [".local-data/accounts/student.json", ".local-data/accounts/professional.json", ".local-data/marketplace.json"]) {
  try { backups.set(file, await fs.readFile(file)); } catch (error) { if (error.code !== "ENOENT") throw error; backups.set(file, null); }
}
// Never reuse a server that might hold different credentials or overwrite its configuration.
try { await fetch(base, { signal: AbortSignal.timeout(1500) }); throw new Error("Port 3100 is already in use. Stop that server before this isolated check."); } catch (error) { if (error.message.startsWith("Port")) throw error; }
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--port", "3100"], { windowsHide: true, env: { ...process.env, APP_ENV: "local", NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "", HC_SESSION_SECRET: randomBytes(48).toString("hex"), HC_STUDENT_PASSWORD_HASH: hash, HC_PRO_PASSWORD_HASH: hash, HC_COOKIE_SECURE: "false" }, stdio: "ignore" });
const exited = new Promise(resolve => server.once("exit", resolve));
let browser;
async function run(command, args) {
  const child = spawn(command, args, { windowsHide: true, stdio: "inherit" });
  await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", code => code === 0 ? resolve() : reject(new Error(args.join(" ") + " failed: " + code))); });
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error("Test server failed to start.");
    try { if ((await fetch(base + "/api/auth/session")).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready, "Test server readiness");
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const publicContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await publicContext.addInitScript(() => localStorage.setItem("hc-cookie-consent", "necessary"));
  const publicPage = await publicContext.newPage();
  await publicPage.goto(base + "/opportunities?type=job&q=Frontend", { waitUntil: "networkidle" });
  await publicPage.getByRole("heading", { name: "Frontend Engineer" }).waitFor();
  assert.equal(await publicPage.getByText("1 opportunity", { exact: true }).count(), 1);
  await publicPage.getByRole("link", { name: "View details" }).click();
  await publicPage.waitForURL("**/opportunities/frontend-engineer-buildora");
  await publicPage.getByRole("heading", { name: "Overview" }).waitFor();
  console.log("PASS public opportunity search, filters, responsive directory and detail");
  await publicContext.close();
  const learner = { learnerSegment: "recent_graduate", city: "Bengaluru", educationLevel: "Graduate", experienceLevel: "Entry level", interests: ["AI", "Design"], skills: ["TypeScript"], desiredRole: "Software engineer", desiredIndustry: "Technology", careerGoals: "Find my first engineering role", availability: "Full time" };
  let marketplaceApplicationId;
  for (const role of ["student", "professional"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    assert.equal((await context.request.patch(base + "/api/profile", { data: { fullName: "Unauthorized" } })).status(), 401);
    assert.equal((await context.request.post(base + "/api/auth", { data: [] })).status(), 400);
    assert.equal((await context.request.post(base + "/api/auth", { data: { action: "signin", email: profiles[role].email, password: "wrong" } })).status(), 401);
    const login = await context.request.post(base + "/api/auth", { data: { action: "signin", email: profiles[role].email, password } }); assert.equal(login.status(), 200);
    const initial = (await login.json()).user;
    assert.equal(initial.role, role);
    assert.equal((await context.request.patch(base + "/api/profile", { data: { fullName: 123 } })).status(), 400);
    assert.equal((await context.request.patch(base + "/api/profile", { headers: { Origin: "https://evil.example" }, data: { fullName: "Bad" } })).status(), 403);
    assert.equal((await context.request.patch(base + "/api/profile", { data: "{", headers: { "Content-Type": "application/json" } })).status(), 400);
    assert.equal((await context.request.post(base + "/api/workspace", { data: { assignmentId: "local-" + (role === "student" ? "professional" : "student") } })).status(), 403);
    assert.equal((await context.request.post(base + "/api/workspace", { data: { assignmentId: "local-" + role } })).status(), 200);
    if (role === "student") {
      const update = await context.request.patch(base + "/api/profile", { data: { uid: profiles.professional.uid, email: "victim@example.com", role: "admin", fullName: initial.fullName } });
      const user = (await update.json()).user; assert.equal(user.uid, initial.uid); assert.equal(user.role, role); assert.equal(user.email, initial.email);
      assert.equal((await context.request.post(base + "/api/onboarding", { data: learner })).status(), 200);
    } else assert.notEqual(initial.careerGoals, learner.careerGoals);
    await context.addInitScript(() => localStorage.setItem("hc-cookie-consent", "necessary"));
    const page = await context.newPage(); const errors = []; page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + "/profile"); await page.getByRole("heading", { name: initial.fullName, exact: true }).waitFor();
    if (role === "student") {
      await page.getByText(learner.careerGoals, { exact: true }).filter({ visible: true }).waitFor();
    }
    await page.goto(base + "/onboarding?step=1"); await page.getByRole("textbox", { name: /^Desired role/ }).waitFor();
    if (role === "student") {
      await page.getByRole("textbox", { name: /^Desired role/ }).fill("Frontend engineer");
      await page.getByRole("button", { name: "Next", exact: true }).click(); await page.getByText("Profile saved.", { exact: true }).filter({ visible: true }).waitFor();
      await page.reload(); await page.goto(base + "/profile"); await page.getByText("Frontend engineer", { exact: true }).filter({ visible: true }).waitFor();
      await page.goto(base + "/opportunities/frontend-engineer-buildora", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Save opportunity" }).click(); await page.getByRole("button", { name: "Saved" }).waitFor();
      await page.getByRole("button", { name: "Saved" }).click(); await page.getByRole("button", { name: "Save opportunity" }).waitFor();
      const applyHref = await page.getByRole("link", { name: "Apply now" }).getAttribute("href"); assert.equal(applyHref, "/opportunities/frontend-engineer-buildora/apply"); await page.goto(base + applyHref);
      await page.getByLabel(/Why do you want to join/).fill("I care about accessible products.");
      await page.getByRole("button", { name: "Save draft" }).click(); await page.waitForURL("**/applications/*"); marketplaceApplicationId = page.url().split("/").at(-1);
      await page.goto(base + "/opportunities/frontend-engineer-buildora"); const resumeHref = await page.getByRole("link", { name: "Resume application" }).getAttribute("href"); assert.equal(resumeHref, "/opportunities/frontend-engineer-buildora/apply"); await page.goto(base + resumeHref);
      await page.getByRole("button", { name: "Submit application" }).click(); await page.waitForURL(`**/applications/${marketplaceApplicationId}`); await page.getByText("submitted", { exact: true }).first().waitFor();
      const duplicate = await context.request.post(base + "/api/applications", { data: { slug: "frontend-engineer-buildora", answers: { motivation: "retry" }, action: "submit" } }); assert.equal(duplicate.status(), 200); assert.equal((await duplicate.json()).application.id, marketplaceApplicationId);
      const blocked = await context.request.patch(base + `/api/employer/applications/${marketplaceApplicationId}`, { data: { action: "status", status: "reviewing" } }); assert.equal(blocked.status(), 403);
      console.log("PASS learner save/unsave, draft/resume/submit, receipt/history, retry idempotency and employer denial");
    } else {
      await page.goto(base + "/employer/opportunities/frontend-engineer-buildora/applications", { waitUntil: "networkidle" });
      if (await page.getByText(profiles.student.email, { exact: false }).count() === 0) throw new Error(`Employer application missing at ${page.url()}: ${(await page.locator("body").innerText()).slice(0, 800)}`);
      await page.getByRole("button", { name: "Update status" }).click(); await page.getByText("Saved.", { exact: true }).waitFor();
      await page.getByLabel("Private note").fill("Strong accessibility experience"); await page.getByRole("button", { name: "Add private note" }).click(); await page.getByText("Strong accessibility experience", { exact: false }).waitFor();
      const csv = await context.request.get(base + "/api/employer/opportunities/frontend-engineer-buildora/export"); assert.equal(csv.status(), 200); assert.match(await csv.text(), /learner@example.com|taheba9671@bitproy.com/);
      console.log("PASS authorized employer list, status history, private note and bounded CSV export");
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    assert.equal((await context.request.post(base + "/api/auth", { data: { action: "logout" } })).status(), 200);
    assert.equal((await (await context.request.get(base + "/api/auth/session")).json()).user, null);
    await page.goto(base + "/profile"); await page.waitForURL("**/auth?**");
    console.log("PASS", role, "seeded login, validation, ownership, role activation, persistence, mobile UI and logout");
    await context.close();
  }
  await browser.close(); browser = undefined;
  if (process.argv.includes("--public-checks")) {
    if (process.env.npm_execpath) await run(process.execPath, [process.env.npm_execpath, "run", "test:smoke"]);
    else await run(process.execPath, ["scripts/smoke.mjs"]);
    await run(process.execPath, ["scripts/verify.mjs"]);
  }
} catch (error) {
  console.error("FOUNDATION FAILURE", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill(); await exited;
  for (const [file, bytes] of backups) {
    if (bytes) await fs.writeFile(file, bytes); else await fs.unlink(file).catch(error => { if (error.code !== "ENOENT") throw error; });
  }
}
