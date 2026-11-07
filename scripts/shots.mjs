// Usage: [TOGGLES=Doors,Frunk] [SETTLE=ms] node scripts/shots.mjs <url> <out-prefix> [views=3/4,Side] [width=1440] [height=900]
// Clicks each camera-preset button by its accessible name and saves one PNG per view.
import { chromium } from "@playwright/test";
const [,, url, out, views = "3/4", w = "1440", h = "900"] = process.argv;
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(5000);
// TOGGLES="Doors,Frunk" flips those switches first (opens the mobile panel if needed).
for (const name of (process.env.TOGGLES ?? "").split(",").filter(Boolean)) {
  const sw = page.getByRole("switch", { name, exact: true }).first();
  if (!(await sw.isVisible())) await page.getByRole("button", { name: /Customise/ }).first().click().catch(() => {});
  await sw.click();
}
for (const v of views.split(",")) {
  const btn = page.getByRole("radio", { name: v, exact: true }).first();
  if (await btn.count()) await btn.click();
  await page.waitForTimeout(+(process.env.SETTLE ?? 4500));
  const file = `${out}-${v.replace(/\W+/g, "") || "hero"}.png`;
  await page.screenshot({ path: file, timeout: 90000 });
  console.log(file);
}
if (errors.length) console.log("ERRORS", JSON.stringify([...new Set(errors)].slice(0, 5)));
await browser.close();
