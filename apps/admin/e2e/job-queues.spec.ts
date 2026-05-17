import { test, expect } from '@playwright/test';

const FAKE_SESSION = 'test-session';

async function isServerUp(baseURL: string): Promise<boolean> {
  try {
    const res = await fetch(baseURL, { signal: AbortSignal.timeout(3000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function injectAdminCookies(context: import('@playwright/test').BrowserContext) {
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

test.describe('Job Queues', () => {
  test.beforeEach(async ({ baseURL }) => {
    if (!(await isServerUp(baseURL ?? 'http://localhost:3000'))) {
      test.skip();
    }
  });

  test('/dashboard/developer/jobs page loads', async ({ page }) => {
    await injectAdminCookies(page.context());
    await page.goto('/dashboard/developer/jobs');

    // Page should load — not redirect to login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 });
    // Some heading or content should be present
    await expect(
      page.getByRole('heading').first().or(page.locator('main').first()),
    ).toBeVisible({ timeout: 5000 });
  });

  test('Queue cards are visible', async ({ page }) => {
    await injectAdminCookies(page.context());
    await page.goto('/dashboard/developer/jobs');

    // At least one queue card should be rendered
    const queueCard = page
      .locator('[data-testid*="queue"], [data-testid*="card"], .card, [class*="card"]')
      .first();
    await expect.soft(queueCard).toBeVisible({ timeout: 5000 });
  });

  test('Queue cards show metric chips', async ({ page }) => {
    await injectAdminCookies(page.context());
    await page.goto('/dashboard/developer/jobs');

    // Metric chips showing waiting/active/completed counts
    const metricChip = page.getByText(/waiting|active|completed|failed/i).first();
    await expect.soft(metricChip).toBeVisible({ timeout: 5000 });
  });

  test('Job table tabs are present', async ({ page }) => {
    await injectAdminCookies(page.context());
    await page.goto('/dashboard/developer/jobs');

    // Tabs for Failed / Active / Waiting should be present
    await expect.soft(page.getByRole('tab', { name: /failed/i }).or(page.getByText(/failed/i)).first()).toBeVisible({
      timeout: 5000,
    });
    await expect.soft(page.getByRole('tab', { name: /active/i }).or(page.getByText(/active/i)).first()).toBeVisible({
      timeout: 5000,
    });
    await expect.soft(page.getByRole('tab', { name: /waiting/i }).or(page.getByText(/waiting/i)).first()).toBeVisible({
      timeout: 5000,
    });
  });
});
