import { expect, test, type Page } from "@playwright/test";

const ROUTES = ["/", "/vehicles", "/vehicles/model-s", "/studio/model-s", "/engineering", "/compare", "/analytics", "/simulation", "/about"];

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

for (const route of ROUTES) {
  test(`${route} renders without runtime errors`, async ({ page }) => {
    const errors = trackErrors(page);
    const res = await page.goto(`${route}${route.includes("?") ? "&" : "?"}q=low`);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    await page.waitForTimeout(1500);
    expect(errors).toEqual([]);
  });
}

test("unknown model returns 404", async ({ page }) => {
  const res = await page.goto("/vehicles/cybertruck");
  expect(res?.status()).toBe(404);
});

test("homepage hero loads the 3D scene and switches vehicles", async ({ page }) => {
  await page.goto("/?q=low");
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("radio", { name: "Model X" }).click();
  await expect(page.getByText("Seven seats, falcon-wing doors")).toBeVisible();
});

test("studio toggles update control state", async ({ page }) => {
  await page.goto("/studio/model-s?q=low");
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
  const doors = page.getByRole("switch", { name: "Doors" });
  await doors.click();
  await expect(doors).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radio", { name: "X-ray" }).click();
  await expect(page.getByRole("radio", { name: "X-ray" })).toHaveAttribute("aria-checked", "true");
});

test("engineering deep link opens the component panel", async ({ page }) => {
  await page.goto("/engineering?component=inverter&q=low");
  await expect(page.getByRole("heading", { name: "Inverter & power electronics" })).toBeVisible();
  await page.getByRole("button", { name: "Battery", exact: true }).click();
  await expect(page.getByRole("heading", { name: "High-voltage battery pack" })).toBeVisible();
});

test("compare reads configurations from the URL", async ({ page }) => {
  await page.goto("/compare?ids=model-3-performance-2026,model-y-performance-2026&q=low");
  await expect(page.getByRole("button", { name: "Remove Model 3 Performance" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Model Y Performance" })).toBeVisible();
});

test("simulation recalculates when inputs change", async ({ page }) => {
  await page.goto("/simulation?q=low");
  const evTotal = page.getByText(/5-yr EV total/).locator("..");
  const before = await evTotal.textContent();
  await page.getByLabel("Miles / year").fill("30000");
  await expect(evTotal).not.toHaveText(before ?? "");
});

test("unit switch converts range to km", async ({ page }) => {
  await page.goto("/vehicles/model-3?q=low");
  // On small screens the unit toggle lives in the mobile menu.
  const menu = page.getByRole("button", { name: "Open menu" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("button", { name: "km" }).locator("visible=true").first().click();
  await expect(page.locator("main").getByText("km", { exact: true }).first()).toBeVisible();
});
