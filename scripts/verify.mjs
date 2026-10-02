import { chromium } from "playwright";
import fs from "node:fs/promises";
await fs.mkdir("test-results", { recursive: true });
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
for (const route of [
  "/",
  "/programs",
  "/offerings",
  "/offerings/corporate-innovation-programs",
  "/blog",
  "/host",
  "/auth",
  "/hackathons/code-for-communities-chandigarh",
]) {
  await p.goto("http://localhost:3100" + route, {
    waitUntil: "networkidle",
    timeout: 90000,
  });
  await p.screenshot({
    path:
      "test-results/" +
      (route === "/" ? "home" : route.slice(1).replaceAll("/", "__")) +
      ".png",
    fullPage: true,
  });
  console.log(
    route,
    await p.title(),
    await p.locator("h1").allTextContents(),
    "images",
    await p
      .locator("img")
      .evaluateAll((es) =>
        es.filter((e) => !e.complete || e.naturalWidth === 0).map((e) => e.src),
      ),
    "overflow",
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  );
}
await p.setViewportSize({ width: 390, height: 844 });
for (const route of [
  "/",
  "/programs",
  "/host",
  "/auth",
  "/hackathons/code-for-communities-chandigarh",
]) {
  await p.goto("http://localhost:3100" + route, { waitUntil: "networkidle" });
  await p.screenshot({
    path:
      "test-results/mobile-" +
      (route === "/" ? "home" : route.slice(1).replaceAll("/", "__")) +
      ".png",
    fullPage: true,
  });
  console.log(
    "MOBILE",
    route,
    "overflow",
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  );
}
console.log("ERRORS", JSON.stringify([...new Set(errors)], null, 2));
await fs.writeFile(
  "test-results/errors.json",
  JSON.stringify([...new Set(errors)], null, 2),
);
await b.close();
