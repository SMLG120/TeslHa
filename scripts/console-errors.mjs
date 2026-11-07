import { chromium } from "@playwright/test";
const [,, base, ...routes] = process.argv;
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const r of routes) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const msgs = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) msgs.push(`${m.type()}: ${m.text().slice(0, 300)}`); });
  page.on("pageerror", (e) => msgs.push("PAGEERROR " + e.message.slice(0, 300)));
  await page.goto(base + r, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(25000);
  // exercise interactions
  for (const name of ["Doors", "Frunk", "Trunk", "Night", "Components"]) { const b = page.getByRole("switch", { name }); if (await b.count()) await b.first().click().catch(() => {}); }
  for (const name of ["X-ray", "Wire", "Interior", "Accelerate", "Regen"]) { const b = page.getByRole("radio", { name }); if (await b.count()) await b.first().click().catch(() => {}); }
  await page.waitForTimeout(8000);
  console.log(`\n=== ${r} (${msgs.length})`); console.log([...new Set(msgs)].slice(0, 15).join("\n"));
  await page.close();
}
await browser.close();
