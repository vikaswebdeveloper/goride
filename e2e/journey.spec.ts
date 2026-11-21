import { expect, test, type Page } from "@playwright/test";

const stamp = Date.now();
const customer = { name: "Asha Rao", email: `asha.${stamp}@example.com`, password: "Passw0rd!123", phone: "9876543210" };

async function pickPlace(page: Page, label: string, text: string, option: RegExp) {
  await page.getByLabel(label, { exact: true }).fill(text);
  await page.getByRole("option", { name: option }).first().click();
}

test.describe.serial("customer journey", () => {
  let bookingUrl = "";

  test("register, search, pay with the simulator and see the confirmation", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Full name").fill(customer.name);
    await page.getByLabel("Email").fill(customer.email);
    await page.getByLabel("Password").fill(customer.password);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/dashboard");

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Your Journey, Your Way." })).toBeVisible();
    await pickPlace(page, "From", "Delhi", /^Delhi/);
    await pickPlace(page, "To", "Jaipur", /Jaipur/);
    await page.getByRole("button", { name: "Search Cabs" }).click();

    await page.waitForURL("**/cars?**");
    await expect(page.getByRole("heading", { name: /Delhi.*Jaipur/ })).toBeVisible();
    await expect(page.getByText(/estimates/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Book Now" }).first()).toBeVisible();

    // Sorting: price high -> low puts the most expensive car first
    const prices = async () => (await page.locator("article p.text-2xl").allInnerTexts()).map((t) => Number(t.replace(/[^\d]/g, "")));
    const asc = await prices();
    expect([...asc].sort((a, b) => a - b)).toEqual(asc);
    await page.getByLabel("Sort by").selectOption("price_desc");
    await expect.poll(async () => (await prices())[0]).toBeGreaterThan(asc[0]);

    await page.getByLabel("Sort by").selectOption("price_asc");
    await expect.poll(async () => (await prices())[0]).toBe(asc[0]);
    await page.getByRole("link", { name: "Book Now" }).first().click();

    await page.waitForURL("**/checkout?**");
    await page.getByLabel("Mobile number").fill(customer.phone);
    await page.getByLabel(/Passengers/).fill("2");
    // Terms are required
    await page.getByRole("button", { name: /^Pay/ }).last().click();
    await expect(page.getByText("You must accept the terms")).toBeVisible();
    await page.getByRole("checkbox").click();

    await page.getByPlaceholder("Coupon code").fill("WELCOME10");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("WELCOME10 applied")).toBeVisible();

    await page.getByRole("button", { name: /^Pay/ }).last().click();
    await expect(page.getByRole("heading", { name: "Payment simulator" })).toBeVisible();
    await page.getByRole("button", { name: "Simulate failure" }).click();
    await expect(page.getByText(/Payment failed/)).toBeVisible();

    await page.getByRole("button", { name: /Retry payment/ }).last().click();
    await page.getByRole("button", { name: "Simulate successful payment" }).click();

    await page.waitForURL("**/bookings/*?confirmed=1");
    await expect(page.getByRole("heading", { name: "Booking confirmed!" })).toBeVisible();
    await expect(page.getByText("Paid", { exact: true }).first()).toBeVisible();
    bookingUrl = new URL(page.url()).pathname;

    // Invoice is downloadable HTML
    const res = await page.request.get(`${bookingUrl.replace("/bookings/", "/api/bookings/")}/invoice`);
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain("Booking receipt");
  });

  test("booking shows in My Bookings and dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(customer.email);
    await page.getByLabel("Password").fill(customer.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL("**/dashboard");
    await page.getByRole("tab", { name: /Upcoming \(1\)/ }).waitFor();
    await page.goto("/bookings?tab=upcoming");
    await expect(page.getByText("Confirmed").first()).toBeVisible();
    await expect(page.getByText(/Delhi/).first()).toBeVisible();
  });

  test("another customer cannot see the booking", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Full name").fill("Other User");
    await page.getByLabel("Email").fill(`other.${stamp}@example.com`);
    await page.getByLabel("Password").fill("Passw0rd!123");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/dashboard");
    const res = await page.goto(bookingUrl);
    expect(res?.status()).toBe(404);
    const api = await page.request.get(bookingUrl.replace("/bookings/", "/api/bookings/"));
    expect(api.status()).toBe(404);
    // and can't reach the admin area
    await page.goto("/admin/dashboard");
    await expect(page).not.toHaveURL(/admin/);
  });

  test("customer can cancel and sees the refund", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(customer.email);
    await page.getByLabel("Password").fill(customer.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL("**/dashboard");
    await page.goto(bookingUrl);
    await page.getByRole("button", { name: "Cancel booking" }).click();
    await expect(page.getByText(/you will receive/)).toBeVisible(); // tier depends on time to pickup (tomorrow 07:00 => 50% or 90%)
    await page.getByRole("button", { name: "Yes, cancel" }).click();
    await expect(page.getByText("Cancelled", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Refunded", { exact: true }).first()).toBeVisible();
  });
});

test.describe("admin", () => {
  test("admin can sign in, see analytics, search bookings and add a car", async ({ page }) => {
    const email = process.env.SEED_ADMIN_EMAIL!;
    const password = process.env.SEED_ADMIN_PASSWORD!;
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL("**/dashboard");

    await page.goto("/admin/dashboard");
    await expect(page.getByRole("heading", { name: "Business overview" })).toBeVisible();
    await expect(page.getByText("Total revenue")).toBeVisible();

    await page.goto("/admin/bookings");
    await page.getByLabel("Search bookings").fill(customer.name.split(" ")[0]);
    await expect(page.getByRole("button", { name: "Manage" }).first()).toBeVisible();

    await page.goto("/admin/cars");
    await page.getByRole("button", { name: "Add car" }).click();
    const model = `TestCar${stamp}`;
    await page.getByLabel("Brand").fill("Tata");
    await page.getByLabel("Model", { exact: true }).fill(model);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(`Tata ${model}`)).toBeVisible();
    await page.getByRole("button", { name: `Delete ${model}` }).click();
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText(`Tata ${model}`)).toHaveCount(0);

    await page.goto("/admin/pricing");
    await expect(page.getByRole("heading", { name: "Sedan" })).toBeVisible();
  });

  test("anonymous visitors are bounced from admin and API", async ({ page, request }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/login/);
    expect((await request.get("/api/admin/bookings")).status()).toBe(401);
    expect((await request.get("/api/bookings")).status()).toBe(401);
  });
});
