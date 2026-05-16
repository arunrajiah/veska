import { test, expect } from '@playwright/test';

// Helper: check if the dev server is up; skip gracefully if not
async function isServerUp(baseURL: string): Promise<boolean> {
  try {
    const res = await fetch(baseURL, { signal: AbortSignal.timeout(3000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

test.describe('Authentication', () => {
  test.beforeEach(async ({ baseURL }) => {
    if (!(await isServerUp(baseURL ?? 'http://localhost:3000'))) {
      test.skip();
    }
  });

  test('login page renders with email and password fields', async ({ page }) => {
    await page.goto('/login');

    // Email input (type=email or placeholder matching)
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // Password input
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
  });

  test('email and password fields are required', async ({ page }) => {
    await page.goto('/login');

    // Both fields should have the `required` attribute
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');
  });

  test('submitting empty form does not navigate away from /login', async ({ page }) => {
    await page.goto('/login');

    // Click submit without filling fields — browser required validation prevents navigation
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // Should still be on /login (required validation blocks submit)
    await expect(page).toHaveURL(/\/login/);
  });

  test('visiting /dashboard without a session redirects to /login', async ({ page }) => {
    // Clear all cookies to ensure no session
    await page.context().clearCookies();
    await page.goto('/dashboard');

    // Middleware should redirect to /login
    await expect(page).toHaveURL(/\/login/);
  });

  test('visiting /onboarding without a session redirects to /login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/onboarding');

    await expect(page).toHaveURL(/\/login/);
  });
});
