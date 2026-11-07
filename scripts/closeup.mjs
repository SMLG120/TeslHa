// node scripts/closeup.mjs <url> <out.png> <view> <x> <y> <w> <h>  — 2x DPR clip of the canvas after selecting a view
import { chromium } from "@playwright/test";
const [,, url, out, view = "3/4", x = "200", y = "250", w = "700", h = "420"] = process.argv;
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await p.goto(url, { waitUntil: "networkidle" });
await p.waitForTimeout(5000);
const btn = p.getByRole("radio", { name: view, exact: true }).first();
if (await btn.count()) await btn.click();
await p.waitForTimeout(3000);
await p.screenshot({ path: out, clip: { x: +x, y: +y, width: +w, height: +h }, timeout: 120000 });
await b.close();
console.log(out);
