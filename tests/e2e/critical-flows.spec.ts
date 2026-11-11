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
  // Generous timeout: the hero GLB blocks the main thread while it compiles under software WebGL.
  await expect(page.getByText("Three rows, falcon-wing doors")).toBeVisible({ timeout: 30_000 });
});

test("homepage hero shows the licensed Roadster model with its credit", async ({ page }) => {
  const blocked: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy/i.test(m.text())) blocked.push(m.text());
  });
  const glb = page.waitForResponse((r) => /\/models\/roadster-gen2\.[0-9a-f]{8}\.glb$/.test(r.url()), { timeout: 30_000 });
  await page.goto("/?q=low");
  expect((await glb).status()).toBe(200);
  await expect(page.getByRole("link", { name: "CC BY 4.0" })).toBeVisible({ timeout: 60_000 });
  expect(blocked).toEqual([]);
});

test("studio toggles update control state", async ({ page }) => {
  await page.goto("/studio/model-s?q=low");
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
  // On small screens the customisation panel starts collapsed.
  const panel = page.getByRole("button", { name: /Customise & specifications/ });
  if (await panel.isVisible()) await panel.click();
  const doors = page.getByRole("switch", { name: "Doors" });
  await doors.click();
  await expect(doors).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radio", { name: "X-ray" }).click();
  await expect(page.getByRole("radio", { name: "X-ray" })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radio", { name: "Rear" }).click();
  await expect(page.getByRole("radio", { name: "Rear" })).toHaveAttribute("aria-checked", "true");
});

test("studio switches models without a page reload", async ({ page }) => {
  await page.goto("/studio/model-s?q=low");
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("navigation", { name: "Choose a vehicle" }).getByRole("button", { name: "Model X" }).click();
  await expect(page).toHaveURL(/\/studio\/model-x$/);
  await expect(page.getByRole("heading", { level: 1, name: "Model X" })).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
});

test("interior explorer switches cabin cameras", async ({ page }) => {
  await page.goto("/studio/model-s?q=low");
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("radiogroup", { name: "Camera view" }).getByRole("radio", { name: "Interior" }).click();
  const cabin = page.getByRole("radiogroup", { name: "Interior camera" });
  await expect(cabin).toBeVisible();
  for (const name of ["Passenger", "Rear", "Dash", "Yoke", "Screen", "Console", "Driver"]) {
    await cabin.getByRole("radio", { name }).click();
    await expect(cabin.getByRole("radio", { name })).toHaveAttribute("aria-checked", "true");
  }
  // Two-seat cars offer no rear-seat camera.
  await page.getByRole("navigation", { name: "Choose a vehicle" }).getByRole("button", { name: "Roadster" }).click();
  await expect(page.getByRole("radiogroup", { name: "Interior camera" }).getByRole("radio", { name: "Rear" })).toHaveCount(0);
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

test("studio keeps the procedural Roadster by default and shows the credited GLB behind ?assets=licensed", async ({ page }) => {
  test.setTimeout(120_000);
  const glbRequests: string[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith(".glb")) glbRequests.push(r.url());
  });
  await page.goto("/studio/roadster?q=low");
  await expect(page.getByText(/Procedural representation/)).toBeVisible({ timeout: 30_000 });
  expect(glbRequests).toEqual([]);

  const glb = page.waitForResponse((r) => /\/models\/roadster-gen2\.[0-9a-f]{8}\.glb$/.test(r.url()), { timeout: 60_000 });
  await page.goto("/studio/roadster?q=low&assets=licensed");
  expect((await glb).status()).toBe(200);
  await expect(page.getByRole("link", { name: "CC BY 4.0" })).toBeVisible({ timeout: 30_000 });
  // The interior explorer needs the procedural cabin, and the caption must say so.
  await page.getByRole("radio", { name: "Interior" }).first().click();
  await expect(page.getByText(/Procedural representation/)).toBeVisible();
});
