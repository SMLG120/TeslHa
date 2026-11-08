// Usage: node scripts/perf.mjs <base-url> [models=model-s,...]
// Loads each studio page with ?perf=1 and reports JS transferred, time to first canvas frame
// and renderer counters (exterior and interior). Software WebGL: fps is not representative.
import { chromium } from "@playwright/test";
const [,, base = "http://localhost:3100", list = "model-s,model-3,model-x,model-y,roadster"] = process.argv;
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const rows = [];
for (const m of list.split(",")) {
  for (const q of ["high", "low"]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    let js = 0;
    page.on("response", async (r) => {
      if (r.request().resourceType() === "script") js += Number((await r.headerValue("content-length")) ?? 0) || (await r.body().catch(() => Buffer.alloc(0))).length;
    });
    const t0 = Date.now();
    await page.goto(`${base}/studio/${m}?perf=1&q=${q}`, { waitUntil: "load" });
    await page.waitForFunction(() => document.documentElement.dataset.perf, null, { timeout: 120000 });
    const ready = Date.now() - t0;
    await page.waitForTimeout(3000);
    const ext = JSON.parse(await page.evaluate(() => document.documentElement.dataset.perf));
    await page.getByRole("radiogroup", { name: "Camera view" }).getByRole("radio", { name: "Interior" }).click();
    await page.waitForTimeout(5000);
    const int = JSON.parse(await page.evaluate(() => document.documentElement.dataset.perf));
    rows.push({ model: m, quality: q, jsKB: Math.round(js / 1024), firstFrameMs: ready, extCalls: ext.calls, extTris: ext.triangles, intCalls: int.calls, intTris: int.triangles, geometries: int.geometries, textures: int.textures, programs: int.programs });
    await page.close();
  }
}
console.table(rows);
console.log(JSON.stringify(rows));
await browser.close();
