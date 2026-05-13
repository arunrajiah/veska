import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      // DB, AI, and channel files require a live Postgres/Redis/LLM — excluded from unit coverage.
      // They are covered by integration tests (see docs/testing.md).
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/db/**',
        'src/ai/**',
        'src/channels/**',
        // Queue requires a live Redis — covered by integration tests
        'src/queue/**',
        // These services require a live DB — covered by integration tests
        'src/services/audit.service.ts',
        'src/services/tenant.service.ts',
        // Pure interface/type files — no runnable logic to cover
        'src/primitives/channel.ts',
        'src/primitives/integration.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
