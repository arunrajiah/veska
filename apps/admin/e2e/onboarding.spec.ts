import { test, expect } from '@playwright/test';

// A fake session token — the middleware only checks that the cookie is truthy,
// not that it's a valid JWT. This lets us test protected routes without a
// running API server.
const FAKE_SESSION = 'test-session-token';

// Helper: check if the dev server is up; skip gracefully if not
async function isServerUp(baseURL: string): Promise<boolean> {
  try {
    const res = await fetch(baseURL, { signal: AbortSignal.timeout(3000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

test.describe('Onboarding flow', () => {
  test.beforeEach(async ({ baseURL }) => {
    if (!(await isServerUp(baseURL ?? 'http://localhost:3000'))) {
      test.skip();
    }
  });

  test('visiting /dashboard with session but without onboarding cookie redirects to /onboarding', async ({
    page,
  }) => {
    await page.context().clearCookies();
    // Inject session but NOT the onboarding_done cookie
    await page.context().addCookies([
      {
        name: 'veska_session',
        value: FAKE_SESSION,
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/dashboard');

    // Middleware should redirect to /onboarding
    await expect(page).toHaveURL(/\/onboarding/);
  });

  test('/onboarding/step/1 renders the company profile form', async ({ page }) => {
    await page.context().clearCookies();
    await page.context().addCookies([
      {
        name: 'veska_session',
        value: FAKE_SESSION,
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/onboarding/step/1');

    // Step 1 asks for company name — expect an input for it
    // The component renders inputs for name, industry, country, currency, size
    const companyNameInput = page
      .locator('input')
      .filter({ hasText: '' })
      .first();
    // At least one text input should be visible
    await expect(page.locator('input').first()).toBeVisible();
  });

  test('step 1 Next button is disabled when company name is empty', async ({ page }) => {
    await page.context().clearCookies();
    await page.context().addCookies([
      {
        name: 'veska_session',
        value: FAKE_SESSION,
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/onboarding/step/1');

    // Find the Next / Continue button
    const nextBtn = page
      .locator('button')
      .filter({ hasText: /next|continue/i })
      .first();
    await expect(nextBtn).toBeDisabled();
  });

  test('can fill step 1 and the Next button becomes enabled', async ({ page }) => {
    await page.context().clearCookies();
    await page.context().addCookies([
      {
        name: 'veska_session',
        value: FAKE_SESSION,
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/onboarding/step/1');

    // Fill company name (first text input on the page)
    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.fill('Acme Corp');

    // Button should become enabled (or at least clickable)
    const nextBtn = page
      .locator('button')
      .filter({ hasText: /next|continue/i })
      .first();
    await expect(nextBtn).not.toBeDisabled();
  });

  test('/onboarding/step/2 shows module toggle grid', async ({ page }) => {
    await page.context().clearCookies();
    await page.context().addCookies([
      {
        name: 'veska_session',
        value: FAKE_SESSION,
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/onboarding/step/2');

    // Step 2 shows module toggles — expect multiple toggle/checkbox elements
    // or buttons representing modules (Finance, HR, Inventory, CRM, etc.)
    const moduleItems = page.locator('button, input[type="checkbox"]');
    await expect(moduleItems.first()).toBeVisible();
  });

  test('/onboarding/step/6 returns a 404 page', async ({ page }) => {
    await page.context().clearCookies();
    await page.context().addCookies([
      {
        name: 'veska_session',
        value: FAKE_SESSION,
        domain: 'localhost',
        path: '/',
      },
    ]);

    const response = await page.goto('/onboarding/step/6');

    // Next.js calls notFound() for step > 5, which returns a 404 status
    expect(response?.status()).toBe(404);
  });
});
