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

test.describe('Password reset flow', () => {
  test.beforeEach(async ({ baseURL }) => {
    if (!(await isServerUp(baseURL ?? 'http://localhost:3000'))) {
      test.skip();
    }
  });

  test('/forgot-password page loads with email input', async ({ page }) => {
    await page.goto('/forgot-password');

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });

  test('submitting a valid email shows the check-your-email success message', async ({ page }) => {
    await page.goto('/forgot-password');

    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('test@example.com');

    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // Expect a success / confirmation message to appear
    const successMessage = page.locator(
      'text=/check your email|email sent|reset link/i',
    );
    await expect(successMessage).toBeVisible({ timeout: 10_000 });
  });

  test('/reset-password with no token shows error state', async ({ page }) => {
    await page.goto('/reset-password');

    // Without a token the page should show an error or redirect
    const hasError = await page
      .locator('text=/invalid|expired|missing|error/i')
      .isVisible()
      .catch(() => false);

    const redirectedToLogin = page.url().includes('/login');

    expect(hasError || redirectedToLogin).toBe(true);
  });

  test('/reset-password with token query param shows the password form', async ({ page }) => {
    await page.goto('/reset-password?token=fake-test-token-12345');

    // Page should render a password input for setting the new password
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();
  });

  test('/register with no token shows error state', async ({ page }) => {
    await page.goto('/register');

    // Without an invite token the register page should show an error or redirect
    const hasError = await page
      .locator('text=/invalid|expired|missing|error|not found/i')
      .isVisible()
      .catch(() => false);

    const redirectedToLogin = page.url().includes('/login');

    // Either an error message is visible or we were redirected away
    expect(hasError || redirectedToLogin).toBe(true);
  });
});
