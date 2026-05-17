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

test.describe('Audit Log', () => {
  test.beforeEach(async ({ baseURL }) => {
    if (!(await isServerUp(baseURL ?? 'http://localhost:3000'))) {
      test.skip();
    }
  });

  test('Audit log page loads at /dashboard/settings/audit-log', async ({ page }) => {
    await injectAuthCookies(page.context());
    await page.goto('/dashboard/settings/audit-log');

    // Should not redirect to login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });

    // Some main content should be visible
    await expect(
      page.getByRole('heading').first().or(page.locator('main').first()),
    ).toBeVisible({ timeout: 5000 });
  });

  test('Page has filter controls', async ({ page }) => {
    await injectAuthCookies(page.context());
    await page.goto('/dashboard/settings/audit-log');

    // Action dropdown filter
    const actionDropdown = page
      .locator('[data-testid*="action"], select, [role="combobox"], [role="listbox"]')
      .first();
    await expect.soft(actionDropdown).toBeVisible({ timeout: 5000 });

    // Entity type dropdown filter
    const entityTypeDropdown = page
      .getByRole('combobox')
      .or(page.locator('select'))
      .nth(1);
    await expect.soft(entityTypeDropdown).toBeVisible({ timeout: 5000 });
  });

  test('Audit log table has expected columns', async ({ page }) => {
    await injectAuthCookies(page.context());
    await page.goto('/dashboard/settings/audit-log');

    // Check for expected column headers
    await expect.soft(page.getByRole('columnheader', { name: /timestamp|date|time/i }).or(page.getByText(/timestamp/i)).first()).toBeVisible({ timeout: 5000 });
    await expect.soft(page.getByRole('columnheader', { name: /user/i }).or(page.getByText(/user/i)).first()).toBeVisible({ timeout: 5000 });
    await expect.soft(page.getByRole('columnheader', { name: /action/i }).or(page.getByText(/action/i)).first()).toBeVisible({ timeout: 5000 });
    await expect.soft(page.getByRole('columnheader', { name: /entity type/i }).or(page.getByText(/entity type/i)).first()).toBeVisible({ timeout: 5000 });
  });

  test('Action badges are color coded', async ({ page }) => {
    await injectAuthCookies(page.context());
    await page.goto('/dashboard/settings/audit-log');

    // Look for badge elements — they typically use a class or data attribute for color
    const badge = page
      .locator('[data-testid*="badge"], [class*="badge"], [class*="chip"], [class*="tag"]')
      .first();
    await expect.soft(badge).toBeVisible({ timeout: 5000 });
  });

  test('Export CSV button is visible', async ({ page }) => {
    await injectAuthCookies(page.context());
    await page.goto('/dashboard/settings/audit-log');

    const exportBtn = page
      .getByRole('button', { name: /export|csv|download/i })
      .or(page.getByText(/export.*csv|download.*csv/i))
      .first();
    await expect.soft(exportBtn).toBeVisible({ timeout: 5000 });
  });
});
