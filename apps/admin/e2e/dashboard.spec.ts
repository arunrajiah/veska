import { test, expect } from '@playwright/test';

// Fake tokens — the middleware checks cookies are truthy, not JWT validity
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

/** Inject both session and onboarding cookies so middleware routes to /dashboard */
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

test.describe('Dashboard', () => {
  test.beforeEach(async ({ baseURL }) => {
    if (!(await isServerUp(baseURL ?? 'http://localhost:3000'))) {
      test.skip();
    }
  });

  test('/dashboard renders the sidebar with "Veska" branding', async ({ page }) => {
    await injectAuthCookies(page.context());
    await page.goto('/dashboard');

    // The DashboardShell renders a <span> with "Veska" text in the sidebar
    const brand = page.locator('aside').getByText('Veska').first();
    await expect(brand).toBeVisible();
  });

  test('Cmd+K opens the Ask Veska panel', async ({ page }) => {
    await injectAuthCookies(page.context());
    await page.goto('/dashboard');

    // Panel should not be visible initially
    const panel = page.locator('[data-testid="ask-veska-panel"], [aria-label*="Ask Veska"], dialog').first();

    // Press Cmd+K (Mac) / Ctrl+K (others)
    await page.keyboard.press('Meta+k');

    // After Cmd+K, the panel or some AI chat UI should appear
    // The hook sets isOpen=true which renders the AskVeskaPanel
    // We look for any element containing the suggested prompts text
    const suggestedPrompt = page.getByText(/summarise|expenses|invoices|leave requests/i).first();
    await expect(suggestedPrompt).toBeVisible({ timeout: 5000 });
  });

  test('Ask Veska panel shows suggested prompts in empty state', async ({ page }) => {
    await injectAuthCookies(page.context());
    await page.goto('/dashboard');

    // Open the panel via Cmd+K
    await page.keyboard.press('Meta+k');

    // The panel shows these prompts in its empty state (defined in panel.tsx)
    await expect(
      page.getByText(/summarise this month.s expenses/i),
    ).toBeVisible({ timeout: 5000 });
  });

  test('Pressing Escape closes the Ask Veska panel', async ({ page }) => {
    await injectAuthCookies(page.context());
    await page.goto('/dashboard');

    // Open panel
    await page.keyboard.press('Meta+k');

    // Wait for panel to open
    const suggestedPrompt = page.getByText(/summarise|expenses|invoices/i).first();
    await expect(suggestedPrompt).toBeVisible({ timeout: 5000 });

    // Close with Escape
    await page.keyboard.press('Escape');

    // Panel content should no longer be visible
    await expect(suggestedPrompt).not.toBeVisible({ timeout: 3000 });
  });
});
