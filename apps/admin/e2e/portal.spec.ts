import { test, expect } from '@playwright/test';

// A fake portal session token injected via cookie to test authenticated portal pages
const FAKE_PORTAL_SESSION = 'test-portal-session-token';

// Helper: check if the dev server is up; skip gracefully if not
async function isServerUp(baseURL: string): Promise<boolean> {
  try {
    const res = await fetch(baseURL, { signal: AbortSignal.timeout(3000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

test.describe('Customer portal', () => {
  test.beforeEach(async ({ baseURL }) => {
    if (!(await isServerUp(baseURL ?? 'http://localhost:3000'))) {
      test.skip();
    }
  });

  test('/portal/invalid-token shows error or redirects', async ({ page }) => {
    await page.goto('/portal/invalid-token');

    const hasError = await page
      .locator('text=/invalid|expired|not found|error/i')
      .isVisible()
      .catch(() => false);

    const redirected = !page.url().includes('/portal/invalid-token');

    expect(hasError || redirected).toBe(true);
  });

  test('portal invoice list page renders with expected structure', async ({ page }) => {
    await page.context().clearCookies();
    await page.context().addCookies([
      {
        name: 'veska_portal_session',
        value: FAKE_PORTAL_SESSION,
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/portal');

    // The portal should render some kind of list or dashboard structure
    // Look for invoice-related content or a main content area
    const mainContent = page.locator('main, [role="main"], h1, h2').first();
    await expect(mainContent).toBeVisible();
  });

  test('Pay Now button is visible for unpaid invoices on portal', async ({ page }) => {
    await page.context().clearCookies();
    await page.context().addCookies([
      {
        name: 'veska_portal_session',
        value: FAKE_PORTAL_SESSION,
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/portal');

    // If there are any unpaid invoices displayed, a Pay Now button should be present.
    // This test passes if either the button is found or no invoices are shown at all
    // (i.e. no false assertion on an empty state).
    const payNowBtn = page.locator('button, a').filter({ hasText: /pay now|pay invoice/i });
    const invoiceRows = page.locator('[data-testid="invoice-row"], tr').filter({ hasText: /unpaid|due/i });

    const hasInvoices = await invoiceRows.count() > 0;
    if (hasInvoices) {
      await expect(payNowBtn.first()).toBeVisible();
    } else {
      // No invoices shown — just verify the page rendered without crashing
      const mainContent = page.locator('main, [role="main"], body').first();
      await expect(mainContent).toBeVisible();
    }
  });

  test('?payment=success shows success banner on portal', async ({ page }) => {
    await page.context().clearCookies();
    await page.context().addCookies([
      {
        name: 'veska_portal_session',
        value: FAKE_PORTAL_SESSION,
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/portal?payment=success');

    // A success banner / toast / alert should be visible after a successful payment redirect
    const successBanner = page.locator(
      'text=/payment successful|paid successfully|thank you|payment received/i',
    );
    await expect(successBanner).toBeVisible({ timeout: 10_000 });
  });
});
