// Usage: node scripts/glb-check.mjs <url> <out.png> [waitMs]. Loads a page under SwiftShader, reports the GLB response and console errors, then screenshots.
import { chromium } from "@playwright/test";
const [url, out, wait = "40000"] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
page.on("console", (m) => { if (m.type() === "error" || /Content Security/i.test(m.text())) errs.push(m.type() + " " + m.text().slice(0, 300)); });
const t0 = Date.now();
const glb = page.waitForResponse((r) => /\.glb$/.test(r.url()), { timeout: 60000 }).then((r) => ({ url: r.url(), status: r.status(), ms: Date.now() - t0 })).catch(() => null);
await page.goto(url, { waitUntil: "domcontentloaded" });
console.log("glb", JSON.stringify(await glb));
await page.waitForTimeout(+wait);
await page.screenshot({ path: out });
console.log(errs.length ? errs.join("\n") : "no console errors");
await browser.close();
