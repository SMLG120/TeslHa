// node contact.mjs out.png img1 img2 ...  → 2-column sheet, each cropped to the canvas centre
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const [,, out, ...imgs] = process.argv;
const cells = imgs.map((f) => `<figure><div style="background-image:url(data:image/png;base64,${readFileSync(f).toString("base64")})"></div><figcaption>${f.split("/").pop()}</figcaption></figure>`).join("");
const html = `<style>body{margin:0;background:#111;display:grid;grid-template-columns:1fr 1fr;gap:4px;width:1400px;font:12px monospace;color:#aaa}
figure{margin:0}div{height:380px;background-size:1120px auto;background-position:-60px -150px;background-repeat:no-repeat}figcaption{padding:2px 6px}</style>${cells}`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 800 } });
await p.setContent(html); await p.screenshot({ path: out, fullPage: true }); await b.close(); console.log(out);
