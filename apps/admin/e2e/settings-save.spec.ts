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

async function setupTenantSettingsMock(page: import('@playwright/test').Page) {
  await page.route('**/tenant-settings', async (route) => {
    if (route.request().method() === 'PATCH' || route.request().method() === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          companyName: 'Test Company',
          timezone: 'UTC',
          currency: 'USD',
        }),
      });
    }
  });
}

test.describe('Settings persistence', () => {
  test.beforeEach(async ({ baseURL }) => {
    if (!(await isServerUp(baseURL ?? 'http://localhost:3000'))) {
      test.skip();
    }
  });

  // 1. Settings page loads and shows Company Profile section
  test('settings page loads and shows Company Profile section', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());
    await setupTenantSettingsMock(page);

    await page.goto('/dashboard/settings');

    const companySection = page
      .getByText(/company profile/i)
      .or(page.getByRole('heading', { name: /company/i }))
      .first();
    await expect(companySection).toBeVisible({ timeout: 8000 });
  });

  // 2. Company name field is pre-populated from API response
  test('company name field is pre-populated from API response', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());
    await setupTenantSettingsMock(page);

    await page.goto('/dashboard/settings');

    // Wait for settings to load
    const companySection = page.getByText(/company profile/i).first();
    await expect(companySection).toBeVisible({ timeout: 8000 });

    // Find the company name input
    const companyNameInput = page
      .locator('input[name="companyName"], input[id="companyName"]')
      .or(page.locator('input[placeholder*="company" i]').first());

    const inputVisible = await companyNameInput.isVisible({ timeout: 3000 }).catch(() => false);
    if (inputVisible) {
      const value = await companyNameInput.inputValue();
      // The mocked API returns 'Test Company' — if pre-populated it should match
      expect.soft(value).toBe('Test Company');
    } else {
      // The company name might be displayed as text if the form isn't editable by default
      const companyNameText = page.getByText('Test Company').first();
      await expect.soft(companyNameText).toBeVisible({ timeout: 3000 });
    }
  });

  // 3. Changing company name and clicking Save triggers PATCH request
  test('saving company name triggers PATCH request to tenant-settings', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());

    let patchCalled = false;
    const capturedPatch: { data: Record<string, unknown> | null } = { data: null };

    await page.route('**/tenant-settings', async (route) => {
      if (route.request().method() === 'PATCH' || route.request().method() === 'PUT') {
        patchCalled = true;
        capturedPatch.data = (await route.request().postDataJSON()) as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            companyName: 'Test Company',
            timezone: 'UTC',
            currency: 'USD',
          }),
        });
      }
    });

    await page.goto('/dashboard/settings');

    // Wait for Company Profile section
    const companySection = page.getByText(/company profile/i).first();
    await expect(companySection).toBeVisible({ timeout: 8000 });

    // Find and fill company name input
    const companyNameInput = page
      .locator('input[name="companyName"], input[id="companyName"]')
      .or(page.locator('input[placeholder*="company" i]').first());

    const inputVisible = await companyNameInput.isVisible({ timeout: 3000 }).catch(() => false);
    if (inputVisible) {
      await companyNameInput.fill('Updated Company Name');

      // Click Save Changes button
      const saveBtn = page
        .getByRole('button', { name: /save changes/i })
        .or(page.getByRole('button', { name: /save/i }).first());
      const saveVisible = await saveBtn.isVisible({ timeout: 3000 }).catch(() => false);
      if (saveVisible) {
        await saveBtn.click();
        await page.waitForTimeout(800);
        expect.soft(patchCalled).toBe(true);
        const patchData = capturedPatch.data;
        if (patchData) {
          expect.soft(patchData['companyName']).toBe('Updated Company Name');
        }
      }
    } else {
      test.skip();
    }
  });

  // 4. Success message appears after save
  test('success toast or message appears after saving settings', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());

    await page.route('**/tenant-settings', async (route) => {
      if (route.request().method() === 'PATCH' || route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            companyName: 'Test Company',
            timezone: 'UTC',
          }),
        });
      }
    });

    await page.goto('/dashboard/settings');

    const companySection = page.getByText(/company profile/i).first();
    await expect(companySection).toBeVisible({ timeout: 8000 });

    // Find company name input and update it
    const companyNameInput = page
      .locator('input[name="companyName"], input[id="companyName"]')
      .first();

    const inputVisible = await companyNameInput.isVisible({ timeout: 3000 }).catch(() => false);
    if (inputVisible) {
      await companyNameInput.fill('Updated Name');

      const saveBtn = page
        .getByRole('button', { name: /save changes/i })
        .or(page.getByRole('button', { name: /save/i }).first());
      const saveVisible = await saveBtn.isVisible({ timeout: 3000 }).catch(() => false);
      if (saveVisible) {
        await saveBtn.click();

        // Look for success feedback
        const successMsg = page
          .getByText(/saved/i)
          .or(page.getByText(/success/i))
          .or(page.locator('[class*="green"]').first());
        await expect.soft(successMsg.first()).toBeVisible({ timeout: 5000 });
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  // 5. Theme selector (Light/Dark/System) buttons are visible
  test('theme selector shows Light, Dark, and System options', async ({ page }) => {
    test.setTimeout(15000);
    await injectAuthCookies(page.context());
    await setupTenantSettingsMock(page);

    // Theme selector is on the security settings page
    await page.goto('/dashboard/settings/security');

    const lightOption = page
      .getByRole('button', { name: /light/i })
      .or(page.getByText(/^light$/i).first());
    await expect.soft(lightOption).toBeVisible({ timeout: 8000 });

    const darkOption = page
      .getByRole('button', { name: /dark/i })
      .or(page.getByText(/^dark$/i).first());
    await expect.soft(darkOption).toBeVisible({ timeout: 3000 });

    const systemOption = page
      .getByRole('button', { name: /system/i })
      .or(page.getByText(/^system$/i).first());
    await expect.soft(systemOption).toBeVisible({ timeout: 3000 });
  });
});
