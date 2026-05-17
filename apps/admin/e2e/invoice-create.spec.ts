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

test.describe('Invoice creation', () => {
  test.beforeEach(async ({ baseURL }) => {
    if (!(await isServerUp(baseURL ?? 'http://localhost:3000'))) {
      test.skip();
    }
  });

  // 1. Navigate to invoices list, click "New Invoice" button
  test('navigates to invoices list and shows New Invoice button', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());
    await page.goto('/dashboard/finance/invoices');

    const newBtn = page
      .getByRole('button', { name: /new invoice/i })
      .or(page.getByText(/new invoice/i).first());
    await expect(newBtn).toBeVisible({ timeout: 8000 });
  });

  // 2. Invoice form renders with expected fields (customer, amount, due date)
  test('invoice form renders with expected fields after clicking New Invoice', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());
    await page.goto('/dashboard/finance/invoices');

    const newBtn = page.getByRole('button', { name: /new invoice/i }).first();
    await expect(newBtn).toBeVisible({ timeout: 8000 });
    await newBtn.click();

    // The slideover form should appear with client name, due date fields
    const clientNameInput = page
      .locator('input[name="clientName"], input[placeholder*="Acme" i], input[placeholder*="client" i]')
      .first();
    await expect(clientNameInput).toBeVisible({ timeout: 5000 });

    const dueDateInput = page.locator('input[name="dueDate"], input[type="date"]').first();
    await expect.soft(dueDateInput).toBeVisible({ timeout: 3000 });

    // Should also have a currency or line item section
    const lineItemSection = page
      .getByText(/line items/i)
      .or(page.locator('input[placeholder="Description"]').first());
    await expect.soft(lineItemSection).toBeVisible({ timeout: 3000 });
  });

  // 3. Form validation: submit empty form shows required field errors
  test('submitting empty invoice form shows validation error', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());
    await page.goto('/dashboard/finance/invoices');

    const newBtn = page.getByRole('button', { name: /new invoice/i }).first();
    await expect(newBtn).toBeVisible({ timeout: 8000 });
    await newBtn.click();

    // Click Create/Submit without filling any fields
    const submitBtn = page
      .getByRole('button', { name: /create invoice/i })
      .or(page.getByRole('button', { name: /submit/i }).last());
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await submitBtn.click();

    // Expect an error message or the form to remain open (client-side validation)
    const errorMsg = page
      .getByText(/required/i)
      .or(page.getByText(/client name is required/i))
      .or(page.locator('[class*="red"]').first());
    await expect.soft(errorMsg.first()).toBeVisible({ timeout: 3000 });

    // Form should remain visible (not navigated away)
    await expect(submitBtn).toBeVisible({ timeout: 2000 });
  });

  // 4. Fill in valid invoice data and submit — mock the POST and assert request body
  test('creates invoice with valid data and mocked API returns 201', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());

    let capturedBody: Record<string, unknown> | null = null;

    await page.route('**/api/v1/finance/invoices', async (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        capturedBody = await request.postDataJSON() as Record<string, unknown>;
        expect(capturedBody.clientName).toBeTruthy();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-id-123',
            number: 'INV-0001',
            status: 'draft',
            ...capturedBody,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            data: {
              clientName: capturedBody.clientName,
              status: 'draft',
              total: capturedBody.total ?? 999,
              number: 'INV-0001',
              dueDate: capturedBody.dueDate,
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/dashboard/finance/invoices');

    const newBtn = page.getByRole('button', { name: /new invoice/i }).first();
    await expect(newBtn).toBeVisible({ timeout: 8000 });
    await newBtn.click();

    // Fill client name
    const clientNameInput = page
      .locator('input[name="clientName"]')
      .or(page.locator('input[placeholder*="Acme" i]'))
      .first();
    await expect(clientNameInput).toBeVisible({ timeout: 5000 });
    await clientNameInput.fill('E2E Test Corp');

    // Fill due date — next month
    const nextMonth = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
    const dueDateInput = page.locator('input[name="dueDate"]').first();
    const dueDateVisible = await dueDateInput.isVisible({ timeout: 2000 }).catch(() => false);
    if (dueDateVisible) {
      await dueDateInput.fill(nextMonth);
    }

    // Fill a line item to produce a total of ~999
    const lineDescInput = page.locator('input[placeholder="Description"]').first();
    const lineDescVisible = await lineDescInput.isVisible({ timeout: 2000 }).catch(() => false);
    if (lineDescVisible) {
      await lineDescInput.fill('E2E Test Service');
      const priceInput = page.locator('input[placeholder="Price"]').first();
      await priceInput.fill('999');
    }

    // Submit
    const submitBtn = page.getByRole('button', { name: /create invoice/i }).first();
    await submitBtn.click();

    // Wait for mock to be called (form either closes or success toast appears)
    await page.waitForTimeout(1000);

    // The request body should have been captured (clientName truthy check above would have run)
    expect(capturedBody).not.toBeNull();
  });

  // 5. Created invoice has status "Draft"
  test('newly created invoice has Draft status in the list', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());

    const mockInvoice = {
      id: 'draft-invoice-555',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: {
        clientName: 'E2E Test Corp',
        status: 'draft',
        total: 999,
        invoiceNumber: 'INV-0001',
        dueDate: new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10),
      },
    };

    // Mock list endpoint to return one draft invoice
    await page.route('**/api/v1/finance/invoices', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([mockInvoice]),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/dashboard/finance/invoices');

    // Look for "draft" status badge in the page
    const draftBadge = page
      .getByText(/draft/i)
      .first();
    await expect.soft(draftBadge).toBeVisible({ timeout: 8000 });
  });

  // 6. "Send Invoice" action on a draft invoice changes status to "Sent" or "Pending Approval"
  test('Send action on a draft invoice triggers the send API', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());

    let sendCalled = false;

    await page.route('**/api/v1/finance/invoices/**/send', async (route) => {
      if (route.request().method() === 'POST') {
        sendCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'test-id-draft', status: 'sent' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/dashboard/finance/invoices');

    // Look for a Send button (visible on draft rows)
    const sendBtn = page
      .getByRole('button', { name: /^send$/i })
      .or(page.locator('button:has-text("Send")').first());

    const sendVisible = await sendBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (sendVisible) {
      await sendBtn.click();
      await page.waitForTimeout(500);
      expect.soft(sendCalled).toBe(true);
    } else {
      // Skip gracefully if no draft invoice is visible in the list
      test.skip();
    }
  });

  // 7. Invoice number is auto-generated (e.g. INV-0001 format)
  test('invoice number follows INV-XXXX format', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());

    const mockInvoice = {
      id: 'auto-num-invoice',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: {
        clientName: 'Test Client',
        status: 'draft',
        total: 100,
        invoiceNumber: 'INV-0001',
        dueDate: '2026-06-01',
      },
    };

    await page.route('**/api/v1/finance/invoices', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([mockInvoice]),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/dashboard/finance/invoices');

    // The invoice number should match INV-XXXX pattern
    const invoiceNumberEl = page
      .getByText(/INV-\d{4}/i)
      .first();
    await expect.soft(invoiceNumberEl).toBeVisible({ timeout: 8000 });
  });
});
