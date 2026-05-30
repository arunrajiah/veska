/**
 * Screenshot capture — takes real screenshots of every major page.
 * Run: npx playwright test e2e/take-screenshots.spec.ts --timeout=120000 --reporter=line
 */
import { test, Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE  = 'http://localhost:3000';
const TENANT_ID     = '608cb01b-ad89-4e51-b690-65ffa4400fe5';
const IDENTITY_ID   = 'c66aa930-ec16-421c-9616-731b4aee618c';
const SESSION_TOKEN = 'dev-test-token-veska-2026';
const OUT_DIR = path.join(__dirname, '../../../docs/images');

async function seedCookies(ctx: BrowserContext) {
  await ctx.addCookies([
    { name: 'veska_session',         value: SESSION_TOKEN, domain: 'localhost', path: '/' },
    { name: 'veska_tenant',          value: TENANT_ID,     domain: 'localhost', path: '/' },
    { name: 'veska_identity',        value: IDENTITY_ID,   domain: 'localhost', path: '/' },
    { name: 'veska_onboarding_done', value: 'true',        domain: 'localhost', path: '/' },
  ]);
}

async function shot(page: Page, route: string, filename: string) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 25000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: false });
  console.log(`✓ ${filename}`);
}

test('capture all screenshots', async ({ browser }) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Login (no auth)
  const loginCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const lp = await loginCtx.newPage();
  await lp.goto(`${BASE}/login`, { waitUntil: 'load', timeout: 20000 });
  await lp.waitForTimeout(1000);
  await lp.screenshot({ path: path.join(OUT_DIR, 'screenshot-login.png') });
  console.log('✓ screenshot-login.png');
  await loginCtx.close();

  // Authenticated
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await seedCookies(ctx);

  await shot(page, '/dashboard',                  'screenshot-dashboard.png');
  await shot(page, '/dashboard/crm',              'screenshot-crm.png');
  await shot(page, '/dashboard/support',          'screenshot-support.png');
  await shot(page, '/dashboard/inbox',            'screenshot-inbox.png');
  await shot(page, '/dashboard/approvals',        'screenshot-approvals.png');
  await shot(page, '/dashboard/analytics',        'screenshot-analytics.png');
  await shot(page, '/dashboard/finance/invoices', 'screenshot-invoices.png');
  await shot(page, '/dashboard/hr',               'screenshot-hr.png');
  await shot(page, '/dashboard/lms',              'screenshot-lms.png');
  await shot(page, '/dashboard/kb',               'screenshot-kb.png');
  await shot(page, '/dashboard/channels',         'screenshot-channels.png');
  await shot(page, '/dashboard/developer',        'screenshot-developer.png');
  await shot(page, '/dashboard/workflows',        'screenshot-workflows.png');
  await shot(page, '/dashboard/settings',         'screenshot-settings.png');
  await shot(page, '/dashboard/reports',          'screenshot-reports.png');

  await ctx.close();
});
