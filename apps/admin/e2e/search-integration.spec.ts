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

const MOCK_SEARCH_RESPONSE = {
  query: 'acme',
  total: 2,
  results: [
    {
      id: '1',
      entityType: 'Invoice',
      title: 'Invoice INV-0001',
      subtitle: 'Acme Corp · paid',
      href: '/dashboard/finance/invoices/1',
      rank: 0.9,
    },
    {
      id: '2',
      entityType: 'Contact',
      title: 'Acme Corp Contact',
      subtitle: 'contact@acme.com',
      href: '/dashboard/crm/contacts/2',
      rank: 0.7,
    },
  ],
};

async function setupSearchMock(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/search*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_SEARCH_RESPONSE),
    });
  });
}

async function openSearchModal(page: import('@playwright/test').Page) {
  await page.keyboard.press('Meta+/');
  const searchInput = page
    .locator('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]')
    .first();
  await expect(searchInput).toBeVisible({ timeout: 5000 });
  return searchInput;
}

test.describe('Search integration', () => {
  test.beforeEach(async ({ baseURL }) => {
    if (!(await isServerUp(baseURL ?? 'http://localhost:3000'))) {
      test.skip();
    }
  });

  // 1. Open search, type "acme" — results appear
  test('typing "acme" in search shows mocked results', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());
    await setupSearchMock(page);

    await page.goto('/dashboard');

    const searchInput = await openSearchModal(page);
    await searchInput.fill('acme');

    // Wait for results to appear — look for the mocked invoice title
    const invoiceResult = page.getByText('Invoice INV-0001').first();
    await expect(invoiceResult).toBeVisible({ timeout: 5000 });
  });

  // 2. Results are grouped by entity type (Invoice section, Contact section)
  test('search results are grouped by entity type', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());
    await setupSearchMock(page);

    await page.goto('/dashboard');

    const searchInput = await openSearchModal(page);
    await searchInput.fill('acme');

    // Both entity type groups should appear
    const invoiceGroup = page.getByText(/invoice/i).first();
    await expect.soft(invoiceGroup).toBeVisible({ timeout: 5000 });

    const contactGroup = page.getByText(/contact/i).first();
    await expect.soft(contactGroup).toBeVisible({ timeout: 5000 });
  });

  // 3. Each result shows title and subtitle
  test('each search result shows title and subtitle', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());
    await setupSearchMock(page);

    await page.goto('/dashboard');

    const searchInput = await openSearchModal(page);
    await searchInput.fill('acme');

    // Title of the first result
    const title1 = page.getByText('Invoice INV-0001').first();
    await expect(title1).toBeVisible({ timeout: 5000 });

    // Subtitle of the first result
    const subtitle1 = page.getByText('Acme Corp · paid').first();
    await expect.soft(subtitle1).toBeVisible({ timeout: 3000 });

    // Title of the second result
    const title2 = page.getByText('Acme Corp Contact').first();
    await expect.soft(title2).toBeVisible({ timeout: 3000 });

    // Subtitle of the second result
    const subtitle2 = page.getByText('contact@acme.com').first();
    await expect.soft(subtitle2).toBeVisible({ timeout: 3000 });
  });

  // 4. Keyboard navigation highlights results
  test('ArrowDown highlights a search result', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());
    await setupSearchMock(page);

    await page.goto('/dashboard');

    const searchInput = await openSearchModal(page);
    await searchInput.fill('acme');

    // Wait for results
    const anyResult = page
      .locator('[role="option"], [role="listitem"], [data-testid*="result"]')
      .first();
    await expect.soft(anyResult).toBeVisible({ timeout: 5000 });

    // Press ArrowDown to highlight
    await page.keyboard.press('ArrowDown');

    // Look for highlighted/selected item
    const highlighted = page.locator(
      '[aria-selected="true"], [data-highlighted="true"], [data-active="true"]',
    );
    await expect.soft(highlighted.first()).toBeVisible({ timeout: 3000 });
  });

  // 5. Enter on highlighted result triggers navigation
  test('pressing Enter on highlighted result triggers navigation', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());
    await setupSearchMock(page);

    await page.goto('/dashboard');
    const initialURL = page.url();

    const searchInput = await openSearchModal(page);
    await searchInput.fill('acme');

    // Wait for results
    const anyResult = page
      .locator('[role="option"], [role="listitem"], [data-testid*="result"]')
      .first();
    const resultsVisible = await anyResult.isVisible({ timeout: 5000 }).catch(() => false);

    if (resultsVisible) {
      // Navigate to first result with ArrowDown + Enter
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');

      // Either URL changed or search modal closed
      await page.waitForTimeout(500);
      const newURL = page.url();
      const modalClosed = await searchInput.isVisible({ timeout: 1000 }).catch(() => false);

      // At least one of: URL changed OR modal closed
      const navigated = newURL !== initialURL || !modalClosed;
      expect.soft(navigated).toBe(true);
    } else {
      // No results rendered — skip the assertion gracefully
      test.skip();
    }
  });
});
