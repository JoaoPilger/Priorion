import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts', 'types/**/*.test.ts'],
    exclude: ['smoke-test/**', 'node_modules/**'],
  },
});
