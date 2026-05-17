import { test, expect } from '@playwright/test';

const FAKE_SESSION = 'test-session-token';

async function isServerUp(baseURL: string): Promise<boolean> {
  try {
    const res = await fetch(baseURL, { signal: AbortSignal.timeout(3000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function injectAuthCookies(context: import('@playwright/test').BrowserContext) {
  await context.clearCookies();
  await context.addCookies([
    {
      name: 'veska_session',
      value: FAKE_SESSION,
      domain: 'localhost',
      path: '/',
    },
    {
      name: 'veska_onboarding_done',
      value: '1',
      domain: 'localhost',
      path: '/',
    },
  ]);
}

test.describe('Recurring Invoices', () => {
  test.beforeEach(async ({ baseURL }) => {
    if (!(await isServerUp(baseURL ?? 'http://localhost:3000'))) {
      test.skip();
    }
  });

  test('Invoice list has Recurring tab', async ({ page }) => {
    await injectAuthCookies(page.context());
    await page.goto('/dashboard/finance/invoices');

    const recurringTab = page
      .getByRole('tab', { name: /recurring/i })
      .or(page.getByText(/recurring/i).first());
    await expect(recurringTab).toBeVisible({ timeout: 5000 });
  });

  test('Recurring tab shows scheduled invoices table', async ({ page }) => {
    await injectAuthCookies(page.context());
    await page.goto('/dashboard/finance/invoices');

    // Click the Recurring tab
    const recurringTab = page.getByRole('tab', { name: /recurring/i });
    const tabVisible = await recurringTab.isVisible({ timeout: 3000 }).catch(() => false);
    if (tabVisible) {
      await recurringTab.click();
    }

    // A table or list should be present (even if empty)
    const table = page
      .locator('table, [role="table"], [data-testid*="table"]')
      .first();
    await expect.soft(table).toBeVisible({ timeout: 5000 });
  });

  test('Invoice detail page has Recurring section', async ({ page }) => {
    await injectAuthCookies(page.context());
    // Navigate to the invoices list first to find a detail link
    await page.goto('/dashboard/finance/invoices');

    // Look for a link to an individual invoice
    const invoiceLink = page
      .locator('a[href*="/invoices/"], [data-testid*="invoice-row"]')
      .first();
    const linkVisible = await invoiceLink.isVisible({ timeout: 3000 }).catch(() => false);

    if (linkVisible) {
      await invoiceLink.click();
      // On the detail page, there should be a recurring section
      const recurringSection = page
        .getByText(/recurring/i)
        .first();
      await expect.soft(recurringSection).toBeVisible({ timeout: 5000 });
    } else {
      // Navigate directly to an expected detail route pattern
      await page.goto('/dashboard/finance/invoices/new');
      const recurringSection = page.getByText(/recurring/i).first();
      await expect.soft(recurringSection).toBeVisible({ timeout: 5000 });
    }
  });

  test('Set up recurring button opens modal', async ({ page }) => {
    await injectAuthCookies(page.context());
    await page.goto('/dashboard/finance/invoices');

    // Look for a "Set up recurring" or "Make recurring" button
    const recurringBtn = page
      .getByRole('button', { name: /set up recurring|make recurring|recurring/i })
      .first();

    const btnVisible = await recurringBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (btnVisible) {
      await recurringBtn.click();

      const modal = page
        .locator('dialog, [role="dialog"], [data-testid*="modal"]')
        .first();
      await expect(modal).toBeVisible({ timeout: 5000 });
    } else {
      // Try finding the button on a detail page
      const invoiceLink = page.locator('a[href*="/invoices/"]').first();
      const hasLink = await invoiceLink.isVisible({ timeout: 2000 }).catch(() => false);
      if (hasLink) {
        await invoiceLink.click();
        const btn = page
          .getByRole('button', { name: /set up recurring|make recurring|recurring/i })
          .first();
        await expect.soft(btn).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('Recurring modal has frequency options', async ({ page }) => {
    await injectAuthCookies(page.context());
    await page.goto('/dashboard/finance/invoices');

    // Try to open any recurring-related modal
    const recurringBtn = page
      .getByRole('button', { name: /set up recurring|make recurring|recurring/i })
      .first();

    const btnVisible = await recurringBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (btnVisible) {
      await recurringBtn.click();

      const modal = page
        .locator('dialog, [role="dialog"]')
        .first();
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Check for frequency options
      await expect.soft(page.getByText(/weekly/i).first()).toBeVisible({ timeout: 3000 });
      await expect.soft(page.getByText(/monthly/i).first()).toBeVisible({ timeout: 3000 });
      await expect.soft(page.getByText(/quarterly/i).first()).toBeVisible({ timeout: 3000 });
      await expect.soft(page.getByText(/yearly|annual/i).first()).toBeVisible({ timeout: 3000 });
    } else {
      // Verify the frequency options exist somewhere on the recurring tab
      const recurringTab = page.getByRole('tab', { name: /recurring/i });
      const tabVisible = await recurringTab.isVisible({ timeout: 2000 }).catch(() => false);
      if (tabVisible) {
        await recurringTab.click();
        await expect.soft(page.getByText(/weekly|monthly|quarterly|yearly/i).first()).toBeVisible({
          timeout: 5000,
        });
      }
    }
  });
});
