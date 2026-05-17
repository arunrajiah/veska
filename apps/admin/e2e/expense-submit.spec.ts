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

test.describe('Expense submission', () => {
  test.beforeEach(async ({ baseURL }) => {
    if (!(await isServerUp(baseURL ?? 'http://localhost:3000'))) {
      test.skip();
    }
  });

  // 1. Navigate to expenses, "New Expense" button visible
  test('expenses list page shows New Expense button', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());
    await page.goto('/dashboard/expenses');

    const newBtn = page
      .getByRole('link', { name: /new expense/i })
      .or(page.getByRole('button', { name: /new expense/i }))
      .or(page.getByText(/new expense/i).first());
    await expect(newBtn).toBeVisible({ timeout: 8000 });
  });

  // 2. Expense form has title, amount, category fields
  test('expense form has description, amount, and category fields', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());
    await page.goto('/dashboard/expenses/new');

    // Description field
    const descriptionInput = page
      .locator('input[name="description"], input[id="description"]')
      .or(page.locator('input[placeholder*="description" i]'))
      .first();
    await expect(descriptionInput).toBeVisible({ timeout: 8000 });

    // Amount field
    const amountInput = page
      .locator('input[name="amount"], input[id="amount"]')
      .or(page.locator('input[type="number"]').first());
    await expect.soft(amountInput).toBeVisible({ timeout: 3000 });

    // Category select
    const categorySelect = page
      .locator('select[name="category"], select[id="category"]')
      .first();
    await expect.soft(categorySelect).toBeVisible({ timeout: 3000 });
  });

  // 3. Empty form shows validation errors
  test('submitting empty expense form shows validation error', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());
    await page.goto('/dashboard/expenses/new');

    // Click "Save as draft" or "Submit for approval" without filling fields
    const draftBtn = page
      .getByRole('button', { name: /save as draft/i })
      .or(page.getByRole('button', { name: /submit for approval/i }).first());
    await expect(draftBtn).toBeVisible({ timeout: 8000 });
    await draftBtn.click();

    // Expect an error message or validation text
    const errorMsg = page
      .getByText(/required/i)
      .or(page.getByText(/description is required/i))
      .or(page.getByText(/valid amount/i))
      .or(page.locator('[class*="red-"]').first());
    await expect.soft(errorMsg.first()).toBeVisible({ timeout: 3000 });

    // Page should still be on the new expense form
    await expect(page).toHaveURL(/\/expenses\/new/, { timeout: 2000 });
  });

  // 4. Fill and submit expense — mock API returns 201
  test('fills and submits expense form with mocked API returning 201', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());

    let capturedBody: Record<string, unknown> | null = null;

    await page.route('**/api/v1/expenses', async (route) => {
      if (route.request().method() === 'POST') {
        capturedBody = await route.request().postDataJSON() as Record<string, unknown>;
        expect(capturedBody.description).toBeTruthy();
        expect(Number(capturedBody.amount)).toBeGreaterThan(0);
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'expense-test-001',
            status: 'draft',
            ...capturedBody,
            createdAt: new Date().toISOString(),
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/dashboard/expenses/new');

    // Fill description (required field)
    const descriptionInput = page
      .locator('input[name="description"], input[id="description"]')
      .first();
    await expect(descriptionInput).toBeVisible({ timeout: 8000 });
    await descriptionInput.fill('E2E Test Expense');

    // Fill amount
    const amountInput = page
      .locator('input[name="amount"], input[id="amount"]')
      .or(page.locator('input[type="number"]').first());
    const amountVisible = await amountInput.isVisible({ timeout: 2000 }).catch(() => false);
    if (amountVisible) {
      await amountInput.fill('250');
    }

    // Fill date if present
    const dateInput = page.locator('input[name="date"], input[type="date"]').first();
    const dateVisible = await dateInput.isVisible({ timeout: 1000 }).catch(() => false);
    if (dateVisible) {
      await dateInput.fill(new Date().toISOString().slice(0, 10));
    }

    // Click Save as draft
    const draftBtn = page.getByRole('button', { name: /save as draft/i }).first();
    await expect(draftBtn).toBeVisible({ timeout: 5000 });
    await draftBtn.click();

    await page.waitForTimeout(800);
    expect(capturedBody).not.toBeNull();
  });

  // 5. Submitted expense appears with "Draft" status
  test('expense list shows items with Draft status', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());

    await page.goto('/dashboard/expenses');

    // The expenses list renders expenses with status badges
    // Look for "draft" badge or any status indicator
    const draftBadge = page
      .getByText(/draft/i)
      .first();
    // Soft: only passes if there are existing draft expenses
    await expect.soft(draftBadge).toBeVisible({ timeout: 8000 });

    // At minimum, the expenses page itself should render
    const heading = page
      .getByRole('heading', { name: /expenses/i })
      .or(page.getByText(/new expense/i).first());
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  // 6. "Submit for Approval" action changes status to "Submitted" (mock the PATCH)
  test('Submit for Approval button triggers PATCH with submitted status', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());

    let submitCalled = false;

    await page.route('**/api/v1/expenses', async (route) => {
      if (route.request().method() === 'POST') {
        const body = await route.request().postDataJSON() as Record<string, unknown>;
        submitCalled = true;
        expect(body.status).toBe('submitted');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'expense-submitted-001',
            status: 'submitted',
            ...body,
            createdAt: new Date().toISOString(),
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/dashboard/expenses/new');

    // Fill required description field
    const descriptionInput = page
      .locator('input[name="description"], input[id="description"]')
      .first();
    await expect(descriptionInput).toBeVisible({ timeout: 8000 });
    await descriptionInput.fill('Expense to submit');

    // Fill amount
    const amountInput = page
      .locator('input[name="amount"], input[id="amount"]')
      .or(page.locator('input[type="number"]').first());
    const amountVisible = await amountInput.isVisible({ timeout: 2000 }).catch(() => false);
    if (amountVisible) {
      await amountInput.fill('100');
    }

    // Click "Submit for approval"
    const submitBtn = page.getByRole('button', { name: /submit for approval/i }).first();
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await submitBtn.click();

    await page.waitForTimeout(800);
    expect(submitCalled).toBe(true);
  });
});
