import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    setupFiles: ['./tests/unit/setup.ts'],
    // Service tests hit a real Postgres (see tests/unit/setup.ts) — run
    // sequentially so table-truncation between tests can't race.
    fileParallelism: false,
  },
});
