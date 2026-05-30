/**
 * Screenshot capture script — takes real screenshots of every major page.
 * Run: npx playwright test e2e/take-screenshots.spec.ts --reporter=line
 */
import { test, Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE  = 'http://localhost:3000';
const TENANT_ID    = '608cb01b-ad89-4e51-b690-65ffa4400fe5';
const IDENTITY_ID  = 'c66aa930-ec16-421c-9616-731b4aee618c';
const SESSION_TOKEN = 'dev-test-token-veska-2026';
const OUT_DIR = path.join(__dirname, '../../../docs/images');

async function seedCookies(ctx: BrowserContext) {
  await ctx.addCookies([
    { name: 'veska_session',       value: SESSION_TOKEN,  domain: 'localhost', path: '/' },
    { name: 'veska_tenant',        value: TENANT_ID,      domain: 'localhost', path: '/' },
    { name: 'veska_identity',      value: IDENTITY_ID,    domain: 'localhost', path: '/' },
    { name: 'veska_onboarding_done', value: 'true',       domain: 'localhost', path: '/' },
  ]);
}

async function shot(page: Page, route: string, filename: string, waitFor?: string) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 25000 });
  if (waitFor) await page.waitForSelector(waitFor, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(1800);
  const dest = path.join(OUT_DIR, filename);
  await page.screenshot({ path: dest, fullPage: false });
  console.log(`✓ ${filename}`);
}

test('capture all screenshots', async ({ browser }) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Create a context, seed cookies, then use it for all screenshots
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Touch the domain first so cookies can be set, then seed
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await seedCookies(ctx);

  // ── Login (no auth needed) ────────────────────────────────
  // Use a fresh context without session to capture login page
  const loginCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const loginPage = await loginCtx.newPage();
  await loginPage.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 20000 });
  await loginPage.waitForTimeout(1000);
  await loginPage.screenshot({ path: path.join(OUT_DIR, 'screenshot-login.png') });
  console.log('✓ screenshot-login.png');
  await loginCtx.close();

  // ── Authenticated pages ───────────────────────────────────
  await shot(page, '/dashboard',                      'screenshot-dashboard.png',  'h1, [data-testid="dashboard"]');
  await shot(page, '/dashboard/crm',                  'screenshot-crm.png');
  await shot(page, '/dashboard/finance/invoices',     'screenshot-invoices.png');
  await shot(page, '/dashboard/hr',                   'screenshot-employees.png');
  await shot(page, '/dashboard/analytics',            'screenshot-analytics.png');
  await shot(page, '/dashboard/reports',              'screenshot-reports.png');
  await shot(page, '/dashboard/channels',             'screenshot-channels.png');
  await shot(page, '/dashboard/developer',            'screenshot-developer.png');
  await shot(page, '/dashboard/workflows',            'screenshot-workflows.png');
  await shot(page, '/dashboard/settings',             'screenshot-settings.png');
  await shot(page, '/dashboard/ai',                   'screenshot-ai.png');

  await ctx.close();
});
