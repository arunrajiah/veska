/**
 * Loads the repo-root `.env` so that `cp .env.example .env` at the root works no
 * matter which workspace directory a script is launched from. pnpm and turbo run
 * package scripts with the cwd set to the package, so `dotenv/config` alone only
 * ever finds a `.env` sitting next to that package.
 *
 * Import this as the FIRST import of any entry point that reads process.env at
 * module scope: ESM evaluates imports in order, so the env is populated before
 * the modules that check it are loaded.
 *
 * Real environment variables always win (Docker Compose, CI), and a missing
 * `.env` is not an error.
 */
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

function findEnvFile(start: string): string | undefined {
  let dir = resolve(start);
  for (;;) {
    const candidate = join(dir, '.env');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

const envPath = findEnvFile(process.cwd());
if (envPath) config({ path: envPath });
