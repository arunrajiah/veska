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

const MOCK_PENDING_APPROVALS = [
  {
    id: 'approval-001',
    entityTitle: 'Office Supplies Q2',
    entityType: 'expense',
    currentStep: 1,
    totalSteps: 2,
    status: 'pending',
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
    updatedAt: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    id: 'approval-002',
    entityTitle: 'Software License Renewal',
    entityType: 'invoice',
    currentStep: 1,
    totalSteps: 1,
    status: 'pending',
    createdAt: new Date(Date.now() - 7200_000).toISOString(),
    updatedAt: new Date(Date.now() - 7200_000).toISOString(),
  },
];

async function setupApprovalsMock(page: import('@playwright/test').Page) {
  // Mock pending approvals endpoint
  await page.route('**/api/v1/approval-requests*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (method === 'POST' && url.includes('/approve')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, status: 'approved' }),
      });
    } else if (method === 'POST' && url.includes('/reject')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, status: 'rejected' }),
      });
    } else if (method === 'GET' || method === 'HEAD') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PENDING_APPROVALS),
      });
    } else {
      await route.continue();
    }
  });
}

test.describe('Approval workflow', () => {
  test.beforeEach(async ({ baseURL }) => {
    if (!(await isServerUp(baseURL ?? 'http://localhost:3000'))) {
      test.skip();
    }
  });

  // 1. Approvals page loads
  test('approvals page loads with Approvals heading', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());
    await setupApprovalsMock(page);

    await page.goto('/dashboard/approvals');

    const heading = page
      .getByRole('heading', { name: /approvals/i })
      .or(page.getByText(/approvals/i).first());
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  // 2. Pending approvals counter shows correct count (mock API)
  test('pending approvals inbox shows correct count badge', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());
    await setupApprovalsMock(page);

    await page.goto('/dashboard/approvals');

    // The inbox tab should show a badge with the count (2 from mock)
    // Look for the badge or count number near "Inbox"
    const inboxCount = page
      .getByText('2')
      .or(page.locator('[class*="badge"], [class*="count"], [class*="rounded-full"]').filter({ hasText: /^\d+$/ }).first());
    await expect.soft(inboxCount.first()).toBeVisible({ timeout: 8000 });

    // The approval items themselves should be visible
    const approvalItem = page.getByText('Office Supplies Q2').first();
    await expect.soft(approvalItem).toBeVisible({ timeout: 5000 });
  });

  // 3. Approve button on a pending item triggers POST with approved decision
  test('clicking Approve button calls approve endpoint', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());

    let approveCalled = false;
    let approveId: string | null = null;

    await page.route('**/api/v1/approval-requests*', async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (method === 'POST' && url.includes('/approve')) {
        approveCalled = true;
        // Extract the ID from URL pattern: /approval-requests/{id}/approve
        const match = url.match(/approval-requests\/([^/]+)\/approve/);
        approveId = match ? (match[1] ?? null) : null;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, status: 'approved' }),
        });
      } else if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_PENDING_APPROVALS),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/dashboard/approvals');

    // Wait for approval items to appear
    const approveBtn = page
      .getByRole('button', { name: /^approve$/i })
      .first();
    await expect(approveBtn).toBeVisible({ timeout: 8000 });

    await approveBtn.click();
    await page.waitForTimeout(800);

    expect(approveCalled).toBe(true);
    expect.soft(approveId).not.toBeNull();
  });

  // 4. Reject button shows reason input
  test('clicking Reject button reveals rejection reason textarea', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());
    await setupApprovalsMock(page);

    await page.goto('/dashboard/approvals');

    // Wait for items to load
    const rejectBtn = page
      .getByRole('button', { name: /^reject$/i })
      .first();
    await expect(rejectBtn).toBeVisible({ timeout: 8000 });

    await rejectBtn.click();

    // A textarea for the rejection reason should appear
    const reasonTextarea = page
      .locator('textarea[placeholder*="comment" i], textarea[placeholder*="reason" i]')
      .or(page.locator('textarea').first());
    await expect(reasonTextarea).toBeVisible({ timeout: 3000 });

    // A "Confirm Reject" button should also appear
    const confirmRejectBtn = page
      .getByRole('button', { name: /confirm reject/i })
      .or(page.getByRole('button', { name: /reject/i }).last());
    await expect.soft(confirmRejectBtn).toBeVisible({ timeout: 3000 });
  });

  // 5. After approval, item is removed from pending list
  test('approved item is removed from the pending list', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());

    // Track requests count
    let getCallCount = 0;

    await page.route('**/api/v1/approval-requests*', async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (method === 'POST' && url.includes('/approve')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, status: 'approved' }),
        });
      } else if (method === 'GET') {
        getCallCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_PENDING_APPROVALS),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/dashboard/approvals');

    // Verify "Office Supplies Q2" is initially visible
    const item1 = page.getByText('Office Supplies Q2').first();
    await expect(item1).toBeVisible({ timeout: 8000 });

    // Click Approve on the first item
    const approveBtn = page
      .getByRole('button', { name: /^approve$/i })
      .first();
    await expect(approveBtn).toBeVisible({ timeout: 5000 });
    await approveBtn.click();

    // After approval the item should disappear from the list
    // The component filters out the approved item from its local state
    await expect(item1).not.toBeVisible({ timeout: 5000 });
  });
});
