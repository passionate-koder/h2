import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.BASE_URL || "http://localhost:3100";
const b = await chromium.launch({ channel: "msedge", headless: true });
const context = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await context.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
await p.goto(base, { waitUntil: "networkidle" });
await p.getByRole("button", { name: "Reject optional" }).click();
await p.reload({ waitUntil: "networkidle" });
assert.equal(
  await p.getByRole("button", { name: "Reject optional" }).count(),
  0,
);
console.log("PASS cookie preference persists");
await p.getByRole("button", { name: "Offerings", exact: true }).hover();
await p.locator("#offerings-menu").waitFor({ state: "visible" });
await p.locator("#offerings-menu a").first().click();
await p.waitForURL("**/offerings/corporate-innovation-programs");
console.log("PASS offerings navigation");
await p.goto(base + "/programs", { waitUntil: "networkidle" });
assert.equal(await p.locator('[data-testid="program-grid"]>a').count(), 8);
await p.getByRole("button", { name: "View More", exact: true }).click();
assert.equal(await p.locator('[data-testid="program-grid"]>a').count(), 16);
await p.getByRole("textbox", { name: "Search programs" }).fill("Chandigarh");
await p.waitForTimeout(250);
assert.equal(await p.locator('[data-testid="program-grid"]>a').count(), 1);
await p
  .getByRole("textbox", { name: "Search programs" })
  .fill("zzzznotaprogram");
await p
  .getByText("No programs found. Try another search or category.")
  .waitFor();
await p.getByRole("textbox", { name: "Search programs" }).fill("");
await p
  .getByRole("button", { name: "Innovation Challenges", exact: true })
  .click();
await p.waitForTimeout(250);
console.log("PASS program search, empty state, pagination, category filter");
await p.goto(base + "/blog?category=business", { waitUntil: "networkidle" });
assert.equal(await p.locator('main a[href^="/blog/"]').count(), 1);
console.log("PASS blog category filter");
await p.goto(base + "/hackathons/code-for-communities-chandigarh", {
  waitUntil: "networkidle",
});
const faq = p.getByRole("button", {
  name: "Who can participate?",
  exact: true,
});
await faq.click();
assert.equal(await faq.getAttribute("aria-expanded"), "true");
assert.equal(
  await faq.locator("..").locator('[aria-hidden="false"]').count(),
  1,
);
await faq.click();
assert.equal(await faq.getAttribute("aria-expanded"), "false");
console.log("PASS FAQ accordion");
await p
  .getByRole("link", { name: "Register Now", exact: true })
  .first()
  .click();
await p.waitForURL("**/auth?**");
console.log("PASS registration sign-in gate");
await p.goto(base + "/auth", { waitUntil: "networkidle" });
await p.getByRole("button", { name: "Sign Up", exact: true }).click();
await p.getByRole("heading", { name: "Join the Innovation" }).waitFor();
await p.getByLabel("Password", { exact: true }).fill("test-password");
await p.getByRole("button", { name: "Show password" }).click();
assert.equal(
  await p.getByLabel("Password", { exact: true }).getAttribute("type"),
  "text",
);
console.log("PASS signup and password visibility");
await p.goto(base + "/host", { waitUntil: "networkidle" });
await p.getByLabel("YOUR NAME", { exact: true }).fill("Test User");
await p.getByLabel("EMAIL", { exact: true }).fill("test@example.com");
await p.getByLabel("PHONE NUMBER", { exact: true }).fill("9876543210");
await p.getByRole("button", { name: "Continue" }).click();
await p.getByLabel("YOU REPRESENT").selectOption({ index: 1 });
await p.getByLabel("COMPANY NAME").fill("Example");
await p.getByLabel("JOB TITLE").fill("Program Lead");
await p.getByRole("button", { name: "Continue" }).click();
await p.getByRole("heading", { name: "Your program" }).waitFor();
console.log("PASS host form validation and multi-step navigation");
await p.setViewportSize({ width: 390, height: 844 });
await p.goto(base, { waitUntil: "networkidle" });
await p.getByRole("button", { name: "Open menu" }).click();
await p.getByRole("navigation", { name: "Mobile navigation" }).waitFor();
await p.getByRole("button", { name: "Close menu" }).click();
await p.getByRole("button", { name: "Next testimonial" }).click();
await p
  .locator(".hc-testimonial-slide")
  .getByText("Subhranshu Kumar", { exact: true })
  .waitFor();
console.log("PASS mobile menu and testimonial carousel");
const routes = JSON.parse(await fs.readFile("src/content/routes.json", "utf8"));
let index = 0;
const failures = [];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    const tab = await context.newPage();
    while (index < routes.length) {
      const r = routes[index++];
      try {
        const response = await tab.goto(base + r.route, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
        if (response.status() !== 200)
          failures.push([r.route, response.status()]);
        // App Router can stream the loading shell before the page content arrives.
        await tab.locator("h1,h2").first().waitFor({ state: "attached" });
        if ((await tab.locator("h1,h2").count()) === 0)
          failures.push([r.route, "missing headings"]);
      } catch (e) {
        failures.push([r.route, e.message]);
      }
    }
    await tab.close();
  }),
);
assert.deepEqual(failures, []);
assert.deepEqual(errors, []);
console.log("PASS", routes.length, "public routes and no runtime exceptions");
await b.close();
