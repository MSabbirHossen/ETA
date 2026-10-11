import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: {
    fs: {
      allow: ['..', '../..'],
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
});
