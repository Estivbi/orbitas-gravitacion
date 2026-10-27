import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'node',
    include: ['tests/repo/**/*.test.ts', 'tests/unit/**/*.test.ts'],
  },
});
