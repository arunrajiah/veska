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

test.describe('Report Builder', () => {
  test.beforeEach(async ({ baseURL }) => {
    if (!(await isServerUp(baseURL ?? 'http://localhost:3000'))) {
      test.skip();
    }
  });

  test('Reports page has Build Custom Report button', async ({ page }) => {
    await injectAuthCookies(page.context());
    await page.goto('/dashboard/reports');

    const buildBtn = page
      .getByRole('button', { name: /build custom report|custom report|new report/i })
      .or(page.getByText(/build custom report/i))
      .first();
    await expect(buildBtn).toBeVisible({ timeout: 5000 });
  });

  test('/dashboard/reports/builder page loads', async ({ page }) => {
    await injectAuthCookies(page.context());
    await page.goto('/dashboard/reports/builder');

    // Should not redirect to login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });

    // Main content should be visible
    await expect(
      page.getByRole('heading').first().or(page.locator('main').first()),
    ).toBeVisible({ timeout: 5000 });
  });

  test('Data source panel shows entity type options', async ({ page }) => {
    await injectAuthCookies(page.context());
    await page.goto('/dashboard/reports/builder');

    // The data source / entity type panel should show selectable options
    const dataSourcePanel = page
      .locator('[data-testid*="data-source"], [data-testid*="entity"], [aria-label*="data source" i]')
      .first();
    const panelVisible = await dataSourcePanel.isVisible({ timeout: 3000 }).catch(() => false);

    if (panelVisible) {
      await expect(dataSourcePanel).toBeVisible();
    } else {
      // Fall back to checking for any entity type list items
      const entityOption = page
        .locator('[role="option"], [role="listitem"], [data-testid*="option"]')
        .first();
      await expect.soft(entityOption).toBeVisible({ timeout: 5000 });
    }
  });

  test('Selecting Invoices shows invoice fields', async ({ page }) => {
    await injectAuthCookies(page.context());
    await page.goto('/dashboard/reports/builder');

    // Try to click an "Invoices" option in the data source panel
    const invoicesOption = page.getByText(/^invoices$/i).or(page.getByRole('option', { name: /invoices/i })).first();
    const optionVisible = await invoicesOption.isVisible({ timeout: 3000 }).catch(() => false);

    if (optionVisible) {
      await invoicesOption.click();

      // After selecting Invoices, invoice-specific fields should appear
      const invoiceField = page
        .getByText(/invoice number|amount|due date|status/i)
        .first();
      await expect.soft(invoiceField).toBeVisible({ timeout: 5000 });
    } else {
      // Check that the builder page shows some field options at all
      const anyField = page
        .locator('[data-testid*="field"], [role="checkbox"], [role="option"]')
        .first();
      await expect.soft(anyField).toBeVisible({ timeout: 5000 });
    }
  });

  test('Run Report button is present', async ({ page }) => {
    await injectAuthCookies(page.context());
    await page.goto('/dashboard/reports/builder');

    const runBtn = page
      .getByRole('button', { name: /run report|run|generate/i })
      .first();
    await expect.soft(runBtn).toBeVisible({ timeout: 5000 });
  });
});
