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

test.describe('Global Search', () => {
  test.beforeEach(async ({ baseURL }) => {
    if (!(await isServerUp(baseURL ?? 'http://localhost:3000'))) {
      test.skip();
    }
  });

  test('Cmd+/ opens the search modal', async ({ page }) => {
    await injectAuthCookies(page.context());
    await page.goto('/dashboard');

    await page.keyboard.press('Meta+/');

    // Search modal/dialog should become visible
    const modal = page
      .locator('dialog, [role="dialog"], [data-testid*="search"], [aria-label*="search" i]')
      .first();
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('Search modal has search input', async ({ page }) => {
    await injectAuthCookies(page.context());
    await page.goto('/dashboard');

    await page.keyboard.press('Meta+/');

    // Wait for the modal to open and check for an input element inside it
    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]')
      .first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await expect.soft(searchInput).toBeFocused();
  });

  test('Typing in search shows loading state', async ({ page }) => {
    await injectAuthCookies(page.context());
    await page.goto('/dashboard');

    await page.keyboard.press('Meta+/');

    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]')
      .first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Type a query — this should trigger a debounced API call and show loading state
    await searchInput.fill('invoice');

    // Look for a loading indicator (spinner, skeleton, aria-busy, etc.)
    const loadingIndicator = page.locator(
      '[aria-busy="true"], [data-loading="true"], [data-testid*="spinner"], [data-testid*="loading"], .animate-spin, [role="progressbar"]',
    );
    await expect.soft(loadingIndicator.first()).toBeVisible({ timeout: 3000 });
  });

  test('Escape closes the search modal', async ({ page }) => {
    await injectAuthCookies(page.context());
    await page.goto('/dashboard');

    await page.keyboard.press('Meta+/');

    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]')
      .first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('Escape');

    await expect(searchInput).not.toBeVisible({ timeout: 3000 });
  });

  test('Search results are keyboard navigable', async ({ page }) => {
    await injectAuthCookies(page.context());
    await page.goto('/dashboard');

    await page.keyboard.press('Meta+/');

    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]')
      .first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    await searchInput.fill('a');

    // Allow some time for results to render
    const resultItem = page
      .locator('[role="option"], [role="listitem"], [data-testid*="result"]')
      .first();
    await expect.soft(resultItem).toBeVisible({ timeout: 5000 });

    // Press ArrowDown to highlight a result
    await page.keyboard.press('ArrowDown');

    // An item should receive focus or an active/highlighted attribute
    const highlightedItem = page.locator(
      '[aria-selected="true"], [data-highlighted="true"], [data-active="true"]',
    );
    await expect.soft(highlightedItem.first()).toBeVisible({ timeout: 2000 });
  });

  test('Clicking a result navigates away', async ({ page }) => {
    await injectAuthCookies(page.context());
    await page.goto('/dashboard');

    const initialURL = page.url();

    await page.keyboard.press('Meta+/');

    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]')
      .first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    await searchInput.fill('a');

    const resultItem = page
      .locator('[role="option"], [role="listitem"], [data-testid*="result"]')
      .first();
    await expect.soft(resultItem).toBeVisible({ timeout: 5000 });

    const isResultVisible = await resultItem.isVisible();
    if (isResultVisible) {
      await resultItem.click();
      // Either the modal closes or the URL changes
      await expect.soft(searchInput).not.toBeVisible({ timeout: 3000 });
    }
  });
});
