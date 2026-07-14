import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// Load the repo-root .env so a DATABASE_URL set there is honoured. Without this,
// drizzle-kit silently fell back to the default localhost URL and a custom
// DATABASE_URL in .env was ignored.
config({ path: '../../.env' });

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? 'postgresql://veska:veska@localhost:5432/veska',
  },
  verbose: true,
  strict: true,
});
