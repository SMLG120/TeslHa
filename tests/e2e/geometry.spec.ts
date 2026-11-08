import { expect, test } from "@playwright/test";

/** Each vehicle is validated in the running app, then taken through every camera without runtime errors. */
const VEHICLES = [
  { path: "/studio/model-s", design: "model-s" },
  { path: "/studio/model-x", design: "model-x" },
  { path: "/studio/model-3", design: "model-3" },
  { path: "/studio/model-y", design: "model-y" },
  { path: "/studio/roadster", design: "roadster-gen1", generation: "1st generation (2008 – 2012)" },
  { path: "/studio/roadster", design: "roadster-gen2" },
];

interface Debug {
  __teslhaDebug?: { go: (s: string) => boolean; shots: readonly string[] };
}

for (const v of VEHICLES) {
  test(`${v.design}: geometry validates and every camera renders`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${v.path}?q=low&debug=geometry`);
    await page.waitForFunction(() => !!(window as unknown as Debug).__teslhaDebug, null, { timeout: 60_000 });
    if (v.generation) await page.getByRole("radio", { name: v.generation, exact: true }).first().click({ force: true });
    await page.waitForFunction((d) => document.documentElement.dataset.geometry?.includes(`"design":"${d}"`), v.design, { timeout: 60_000 });
    const report = JSON.parse((await page.evaluate(() => document.documentElement.dataset.geometry)) ?? "{}");
    expect(report.checks).toBeGreaterThan(40);
    expect(report.failures).toEqual([]);
    const shots = await page.evaluate(() => [...(window as unknown as Debug).__teslhaDebug!.shots]);
    for (const shot of shots) {
      await page.evaluate((s) => (window as unknown as Debug).__teslhaDebug!.go(s), shot);
      await page.waitForTimeout(250);
    }
    await expect(page.locator("canvas").first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}
