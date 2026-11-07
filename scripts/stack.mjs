import { chromium } from "@playwright/test";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
const seen = new Set();
page.on("pageerror", (e) => { const k = e.stack?.slice(0, 1500); if (!seen.has(k)) { seen.add(k); console.log("PAGEERROR", k); } });
await page.goto(process.argv[2], { waitUntil: "domcontentloaded" });
await page.waitForTimeout(+(process.argv[3] ?? 30000));
console.log("distinct errors:", seen.size);
await browser.close();
