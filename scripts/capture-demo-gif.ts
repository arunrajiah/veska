/**
 * Captures the Veska AI onboarding demo GIF.
 * Run: /path/to/tsx scripts/capture-demo-gif.ts
 */
import { chromium, type Page, type BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const BASE     = 'http://localhost:3000';
const TENANT   = '608cb01b-ad89-4e51-b690-65ffa4400fe5';
const IDENTITY = 'c66aa930-ec16-421c-9616-731b4aee618c';
const SESSION  = 'dev-test-token-veska-2026';
const W = 1280, H = 800;

const FRAMES_DIR = '/tmp/veska-demo-frames';
const OUT_GIF    = path.resolve(__dirname, '../docs/images/demo.gif');
const OUT_MP4    = path.resolve(__dirname, '../docs/images/demo.mp4');

// GIF speed: 3 fps = 333ms per frame — slow enough to read each screen
const FPS = 3;

let fi = 0;

/** Take N identical frames to "hold" on the current screen for N * (1/fps) seconds */
async function hold(page: Page, frames: number, pauseMsFirst = 0) {
  if (pauseMsFirst > 0) await page.waitForTimeout(pauseMsFirst);
  for (let i = 0; i < frames; i++) {
    await page.screenshot({ path: `${FRAMES_DIR}/f${String(fi).padStart(5, '0')}.png`, fullPage: false });
    fi++;
    if (i < frames - 1) await page.waitForTimeout(80); // small gap between dupe frames
  }
}

/** Type text slowly, one char at a time, snapping every N chars */
async function typeSlowly(page: Page, sel: string, text: string, snapEvery = 5) {
  const el = page.locator(sel).first();
  await el.click();
  for (let i = 0; i < text.length; i++) {
    await el.pressSequentially(text[i]!, { delay: 70 });
    if (i % snapEvery === 0) await hold(page, 1);
  }
  await hold(page, 2, 200); // hold on completed text
}

async function addAuthCookies(ctx: BrowserContext) {
  await ctx.addCookies([
    { name: 'veska_session',         value: SESSION,  domain: 'localhost', path: '/' },
    { name: 'veska_tenant',          value: TENANT,   domain: 'localhost', path: '/' },
    { name: 'veska_identity',        value: IDENTITY, domain: 'localhost', path: '/' },
    { name: 'veska_onboarding_done', value: 'true',   domain: 'localhost', path: '/' },
  ]);
}

/** Hide Next.js dev error overlay before taking screenshots */
async function hideDevOverlay(page: Page) {
  await page.evaluate(() => {
    // Hide Next.js error badge/overlay
    const selectors = [
      'nextjs-portal',
      '[data-nextjs-toast]',
      'button[aria-label*="error" i]',
      '#__next-build-watcher',
    ];
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el) => {
        (el as HTMLElement).style.display = 'none';
      });
    }
    // Also hide shadow DOM error badge
    const portal = document.querySelector('nextjs-portal');
    if (portal?.shadowRoot) {
      (portal as HTMLElement).style.display = 'none';
    }
  }).catch(() => {}); // ignore if elements don't exist
}

async function navigate(page: Page, url: string, holdFrames = 6) {
  // Use 'load' — dashboard has SSE streams that block 'networkidle' forever
  await page.goto(url, { waitUntil: 'load', timeout: 25000 });
  await page.waitForTimeout(1200); // extra wait for JS hydration + data fetch
  await hideDevOverlay(page);
  await hold(page, holdFrames);
}

async function warmup(browser: ReturnType<typeof chromium.launch> extends Promise<infer T> ? T : never) {
  console.log('Warming up pages (triggering CSS compilation)...');
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  const p = await ctx.newPage();
  await addAuthCookies(ctx);

  // Visit each page once to trigger Next.js compilation
  const pages = [
    `${BASE}/onboarding/step/1`,
    `${BASE}/onboarding/step/2`,
    `${BASE}/onboarding/step/3`,
    `${BASE}/onboarding/step/4`,
    `${BASE}/onboarding/step/5`,
    `${BASE}/dashboard`,
    `${BASE}/dashboard/crm`,
    `${BASE}/dashboard/analytics`,
    `${BASE}/dashboard/channels`,
    `${BASE}/dashboard/settings`,
  ];

  for (const url of pages) {
    try {
      await p.goto(url, { waitUntil: 'load', timeout: 25000 });
      await p.waitForTimeout(400);
      process.stdout.write('.');
    } catch {
      process.stdout.write('x');
    }
  }
  console.log('\nWarmup done. Starting capture...');
  await ctx.close();
}

async function main() {
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  // Pre-warm all pages so CSS is compiled
  await warmup(browser);

  // ── Scene 1: Onboarding wizard — step 1: Company profile ────────────────
  console.log('\nScene 1: Onboarding wizard...');
  const ctx1 = await browser.newContext({ viewport: { width: W, height: H } });
  const p1 = await ctx1.newPage();

  // Step 1 — Company profile
  await p1.goto(`${BASE}/onboarding/step/1`, { waitUntil: 'load', timeout: 20000 });
  await p1.waitForTimeout(600);
  await hideDevOverlay(p1);
  await hold(p1, 9); // Hold 3s on step 1

  // Fill in company name (type it slowly)
  const nameInput = p1.locator('input[placeholder*="Acme"], input[name="name"], input[placeholder*="company" i]').first();
  if (await nameInput.count() > 0) {
    await nameInput.click();
    for (const ch of 'Acme Corp') {
      await nameInput.pressSequentially(ch, { delay: 80 });
      if (Math.random() > 0.5) await hold(p1, 1);
    }
    await hold(p1, 3, 200);
  }

  // Step 2 — Modules
  await navigate(p1, `${BASE}/onboarding/step/2`, 9);

  // Step 3 — Team
  await navigate(p1, `${BASE}/onboarding/step/3`, 9);

  // Step 4 — AI Setup
  await navigate(p1, `${BASE}/onboarding/step/4`, 9);

  // Step 5 — Done / confetti
  await navigate(p1, `${BASE}/onboarding/step/5`, 12); // Hold longer on completion
  await ctx1.close();

  // ── Scene 2: Dashboard overview ──────────────────────────────────────────
  console.log('Scene 2: Dashboard...');
  const ctx2 = await browser.newContext({ viewport: { width: W, height: H } });
  const p2 = await ctx2.newPage();
  await p2.goto(BASE, { waitUntil: 'domcontentloaded' });
  await addAuthCookies(ctx2);

  await navigate(p2, `${BASE}/dashboard`, 12); // Dashboard — hold 4s

  // ── Scene 3: CRM ─────────────────────────────────────────────────────────
  console.log('Scene 3: CRM...');
  await navigate(p2, `${BASE}/dashboard/crm`, 9);

  // ── Scene 4: Analytics with real charts ──────────────────────────────────
  console.log('Scene 4: Analytics...');
  await navigate(p2, `${BASE}/dashboard/analytics`, 12);

  // ── Scene 5: Channels — the "no login" story ────────────────────────────
  console.log('Scene 5: Channels...');
  await navigate(p2, `${BASE}/dashboard/channels`, 9);

  // ── Scene 6: Settings / company config ───────────────────────────────────
  console.log('Scene 6: Settings...');
  await navigate(p2, `${BASE}/dashboard/settings`, 9);

  await ctx2.close();
  await browser.close();

  const totalFrames = fi;
  const durationSec = (totalFrames / FPS).toFixed(1);
  console.log(`\nCaptured ${totalFrames} frames → ${durationSec}s at ${FPS} fps`);
  console.log('Encoding...');

  // ── Encode MP4 ────────────────────────────────────────────────────────────
  execSync(
    `ffmpeg -y -framerate ${FPS} -pattern_type glob -i '${FRAMES_DIR}/f?????.png' \
     -vf "scale=${W}:${H}:flags=lanczos" \
     -c:v libx264 -pix_fmt yuv420p -crf 20 \
     "${OUT_MP4}" 2>/dev/null`,
    { stdio: 'inherit' },
  );
  console.log(`✓ MP4  → ${OUT_MP4}`);

  // ── Encode GIF (two-pass palette for best quality) ────────────────────────
  execSync(
    `ffmpeg -y -framerate ${FPS} -pattern_type glob -i '${FRAMES_DIR}/f?????.png' \
     -vf "fps=${FPS},scale=1280:-1:flags=lanczos,palettegen=max_colors=128:stats_mode=diff" \
     /tmp/vp.png 2>/dev/null`,
    { stdio: 'inherit' },
  );
  execSync(
    `ffmpeg -y -framerate ${FPS} -pattern_type glob -i '${FRAMES_DIR}/f?????.png' -i /tmp/vp.png \
     -lavfi "fps=${FPS},scale=1280:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=3" \
     "${OUT_GIF}" 2>/dev/null`,
    { stdio: 'inherit' },
  );

  const sz = fs.statSync(OUT_GIF).size;
  console.log(`✓ GIF  → ${OUT_GIF}  (${(sz / 1024 / 1024).toFixed(1)} MB, ${totalFrames} frames)`);
  console.log(`  Duration: ~${durationSec} seconds, ${FPS} fps`);
}

main().catch((e) => { console.error(e); process.exit(1); });
