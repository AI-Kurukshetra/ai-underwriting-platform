import { expect, test } from "@playwright/test";

test("homepage loads and exposes primary CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /AI-assisted personal loan decisions/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /sign in|open dashboard/i }).first()).toBeVisible();
});

test("login page loads", async ({ page }) => {
  await page.goto("/auth/login");
  await expect(page.getByRole("heading", { name: /sign in to the underwriting workspace/i })).toBeVisible();
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
});

test("protected APIs require authentication", async ({ request, baseURL }) => {
  const monitoring = await request.get(`${baseURL}/api/monitoring`);
  expect(monitoring.status()).toBe(401);

  const apps = await request.get(`${baseURL}/api/applications`);
  expect(apps.status()).toBe(401);
});
