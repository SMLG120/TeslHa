// Usage: node scripts/geometry-shots.mjs <outDir> [baseUrl] [width=1280] [height=800] [debugMode=1] [models]
// Renders every vehicle from every required camera through the ?debug=1 camera bridge.
import { chromium } from "@playwright/test";
import fs from "node:fs";
const [, , out, base = "http://localhost:3100", w = "1280", h = "800", debug = "1", only = ""] = process.argv;
const ALL = [
  ["model-s", "/studio/model-s", null],
  ["model-x", "/studio/model-x", null],
  ["model-3", "/studio/model-3", null],
  ["model-y", "/studio/model-y", null],
  ["roadster-next", "/studio/roadster", "Next generation (announced)"],
  ["roadster-gen1", "/studio/roadster", "1st generation (2008 – 2012)"],
];
const models = only ? ALL.filter(([id]) => only.split(",").includes(id)) : ALL;
const SHOTS = ["front", "rear", "left", "right", "top", "hero", "driver", "passenger", "rearseat", "dashboard", "rearcabin"];
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
let failed = 0;
for (const [id, path, gen] of models) {
  const ctx = await browser.newContext({ viewport: { width: +w, height: +h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}${path}?q=medium&debug=${debug}`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForFunction(() => !!window.__teslhaDebug, null, { timeout: 90000 });
  if (gen) {
    await page.getByRole("radio", { name: gen, exact: true }).first().click({ force: true });
    await page.waitForTimeout(5000);
  }
  for (const shot of SHOTS) {
    const ok = await page.evaluate((s) => window.__teslhaDebug.go(s), shot);
    if (!ok) {
      console.log(`${id} ${shot}: n/a (no such seat)`);
      continue;
    }
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `${out}/${id}-${shot}.png`, timeout: 120000 });
  }
  if (process.env.DOORS) {
    await page.evaluate(() => window.__teslhaDebug.doors(true));
    await page.waitForTimeout(3500);
    for (const shot of ["hero", "right", "top", "driver"]) {
      await page.evaluate((s) => window.__teslhaDebug.go(s), shot);
      await page.waitForTimeout(2200);
      await page.screenshot({ path: `${out}/${id}-doors-${shot}.png`, timeout: 120000 });
    }
  }
  if (errors.length) {
    failed++;
    console.log(`${id} ERRORS`, JSON.stringify([...new Set(errors)].slice(0, 3)));
  } else console.log(`${id} ok`);
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
