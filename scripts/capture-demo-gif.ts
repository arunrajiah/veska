/**
 * Captures a demo GIF showing the Veska AI onboarding flow:
 *   Setup page → AI chat → onboarding wizard → configured dashboard
 *
 * Run:  npx tsx scripts/capture-demo-gif.ts
 * Needs: ffmpeg, playwright chromium
 */

import { chromium, type Page, type BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const BASE   = 'http://localhost:3000';
const TENANT = '608cb01b-ad89-4e51-b690-65ffa4400fe5';
const IDENTITY = 'c66aa930-ec16-421c-9616-731b4aee618c';
const SESSION  = 'dev-test-token-veska-2026';

const FRAMES_DIR = '/tmp/veska-demo-frames';
const OUT_GIF    = path.join(__dirname, '../docs/images/demo.gif');
const OUT_MP4    = path.join(__dirname, '../docs/images/demo.mp4');

let frameIndex = 0;

async function frame(page: Page, delayMs = 0) {
  if (delayMs > 0) await page.waitForTimeout(delayMs);
  const p = path.join(FRAMES_DIR, `frame-${String(frameIndex).padStart(4, '0')}.png`);
  await page.screenshot({ path: p, fullPage: false });
  frameIndex++;
}

/** Slowly type text character by character, capturing frames as we go */
async function typeSlowly(page: Page, selector: string, text: string) {
  const el = page.locator(selector);
  await el.click();
  for (const char of text) {
    await el.pressSequentially(char, { delay: 60 });
    // Capture a frame every ~4 chars so typing is visible
    if (frameIndex % 4 === 0) await frame(page);
  }
  await frame(page, 200);
}

async function seedCookies(ctx: BrowserContext) {
  await ctx.addCookies([
    { name: 'veska_session',         value: SESSION,  domain: 'localhost', path: '/' },
    { name: 'veska_tenant',          value: TENANT,   domain: 'localhost', path: '/' },
    { name: 'veska_identity',        value: IDENTITY, domain: 'localhost', path: '/' },
    { name: 'veska_onboarding_done', value: 'true',   domain: 'localhost', path: '/' },
  ]);
}

async function main() {
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  // ── Scene 1: Setup / AI onboarding chat ──────────────────────────────────
  // Show the clean setup page as if a new user just arrived
  const setupCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const setupPage = await setupCtx.newPage();
  await setupPage.goto(`${BASE}/setup`, { waitUntil: 'load', timeout: 20000 });
  await frame(setupPage, 1200); // hold on clean page

  // Type the AI prompt slowly
  const PROMPT = "We're Acme Corp, a 20-person B2B software company. Our sales team needs CRM to track leads and deals, we invoice clients monthly, and need basic HR for leave requests. We use Slack.";

  // Find the textarea or input in the setup chat
  const inputSel = 'textarea, input[type="text"]';
  try {
    await setupPage.waitForSelector(inputSel, { timeout: 5000 });
    await typeSlowly(setupPage, inputSel, PROMPT);
    await frame(setupPage, 300);

    // Click send button
    const sendBtn = setupPage.locator('button[type="submit"], button:has-text("Send"), button:has-text("→")').first();
    if (await sendBtn.count() > 0) {
      await sendBtn.click();
      // Capture "AI thinking" frames
      for (let i = 0; i < 8; i++) await frame(setupPage, 400);
    }
  } catch {
    // Setup page might not have the chat input — just capture what's there
    for (let i = 0; i < 6; i++) await frame(setupPage, 300);
  }
  await setupCtx.close();

  // ── Scene 2: Onboarding wizard steps ─────────────────────────────────────
  // Show the 5-step onboarding wizard
  const obCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const obPage = await obCtx.newPage();
  await obPage.goto(`${BASE}/onboarding/step/1`, { waitUntil: 'load', timeout: 20000 });
  await frame(obPage, 800);
  await frame(obPage, 600);

  // Step 2 — Modules
  await obPage.goto(`${BASE}/onboarding/step/2`, { waitUntil: 'load', timeout: 15000 });
  await frame(obPage, 700);
  await frame(obPage, 500);

  // Step 3 — Team
  await obPage.goto(`${BASE}/onboarding/step/3`, { waitUntil: 'load', timeout: 15000 });
  await frame(obPage, 700);

  // Step 4 — AI Setup
  await obPage.goto(`${BASE}/onboarding/step/4`, { waitUntil: 'load', timeout: 15000 });
  await frame(obPage, 700);

  // Step 5 — Done / confetti
  await obPage.goto(`${BASE}/onboarding/step/5`, { waitUntil: 'load', timeout: 15000 });
  await frame(obPage, 500);
  await frame(obPage, 500);
  await frame(obPage, 500);
  await obCtx.close();

  // ── Scene 3: Dashboard — the configured workspace ─────────────────────────
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await seedCookies(ctx);

  await page.goto(`${BASE}/dashboard`, { waitUntil: 'load', timeout: 20000 });
  await frame(page, 1000);
  await frame(page, 500);

  // Pan to CRM
  await page.goto(`${BASE}/dashboard/crm`, { waitUntil: 'load', timeout: 20000 });
  await frame(page, 800);

  // Pan to Finance
  await page.goto(`${BASE}/dashboard/finance/invoices`, { waitUntil: 'load', timeout: 20000 });
  await frame(page, 800);

  // Pan to Analytics
  await page.goto(`${BASE}/dashboard/analytics`, { waitUntil: 'load', timeout: 20000 });
  await frame(page, 1000);
  await frame(page, 500);

  // Pan to Channels (the AI integration story)
  await page.goto(`${BASE}/dashboard/channels`, { waitUntil: 'load', timeout: 20000 });
  await frame(page, 800);
  await frame(page, 400);

  await browser.close();

  const totalFrames = frameIndex;
  console.log(`Captured ${totalFrames} frames. Encoding...`);

  // ── Encode MP4 first (better quality reference) ───────────────────────────
  execSync(
    `ffmpeg -y -framerate 4 -i "${FRAMES_DIR}/frame-%04d.png" \
      -vf "scale=1280:800:flags=lanczos,fps=4" \
      -c:v libx264 -pix_fmt yuv420p -crf 23 \
      "${OUT_MP4}" 2>/dev/null`,
    { stdio: 'inherit' },
  );
  console.log(`✓ MP4 saved: ${OUT_MP4}`);

  // ── Encode GIF (for README / GitHub) ────────────────────────────────────
  // Two-pass palette approach for best quality
  execSync(
    `ffmpeg -y -framerate 4 -i "${FRAMES_DIR}/frame-%04d.png" \
      -vf "fps=4,scale=1280:-1:flags=lanczos,palettegen=max_colors=128" \
      /tmp/palette.png 2>/dev/null`,
    { stdio: 'inherit' },
  );
  execSync(
    `ffmpeg -y -framerate 4 -i "${FRAMES_DIR}/frame-%04d.png" -i /tmp/palette.png \
      -lavfi "fps=4,scale=1280:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer" \
      "${OUT_GIF}" 2>/dev/null`,
    { stdio: 'inherit' },
  );

  const gifSize = fs.statSync(OUT_GIF).size;
  console.log(`✓ GIF saved: ${OUT_GIF} (${(gifSize / 1024 / 1024).toFixed(1)} MB)`);

  // If GIF > 15 MB, create a smaller 640px version for README
  if (gifSize > 15 * 1024 * 1024) {
    const smallGif = OUT_GIF.replace('.gif', '-small.gif');
    execSync(
      `ffmpeg -y -framerate 3 -i "${FRAMES_DIR}/frame-%04d.png" -i /tmp/palette.png \
        -lavfi "fps=3,scale=900:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer" \
        "${smallGif}" 2>/dev/null`,
      { stdio: 'inherit' },
    );
    const smallSize = fs.statSync(smallGif).size;
    console.log(`✓ Small GIF: ${smallGif} (${(smallSize / 1024 / 1024).toFixed(1)} MB)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
