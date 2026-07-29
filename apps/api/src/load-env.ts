/**
 * Loads the repo-root `.env` so that `cp .env.example .env` at the root works no
 * matter which workspace directory the API is launched from. pnpm and turbo run
 * package scripts with the cwd set to the package, so `dotenv/config` alone only
 * ever finds a `.env` sitting next to apps/api.
 *
 * Kept local to apps/api rather than imported from @veska/core: this has to run
 * before anything else is evaluated, and pulling in the core barrel would load
 * modules that read process.env first.
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
