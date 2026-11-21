import { expect, test } from "@playwright/test";

// Runs on desktop and a phone viewport: no page may scroll horizontally.
for (const path of ["/", "/routes", "/login", "/register", "/about", "/cancellation-policy"]) {
  test(`no horizontal overflow on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("home search card validates before navigating", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Search Cabs" }).click();
  await expect(page.getByText("Select a pickup location")).toBeVisible();
  await expect(page.getByText("Select a destination")).toBeVisible();
});

test("swap button exchanges locations", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("From", { exact: true }).fill("Mumbai");
  await page.getByRole("option", { name: /Mumbai/ }).first().click();
  await page.getByLabel("To", { exact: true }).fill("Pune");
  await page.getByRole("option", { name: /Pune/ }).first().click();
  await page.getByRole("button", { name: /Swap/ }).click();
  await expect(page.getByLabel("From", { exact: true })).toHaveValue(/Pune/);
  await expect(page.getByLabel("To", { exact: true })).toHaveValue(/Mumbai/);
});

test("round trip reveals the return date", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Return date")).toHaveCount(0);
  await page.getByRole("tab", { name: "Round Trip" }).click();
  await expect(page.getByLabel("Return date")).toBeVisible();
});
