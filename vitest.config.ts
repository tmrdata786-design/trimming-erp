import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // happy-dom provides localStorage for frontend service tests
    environment: 'happy-dom',
    include: ['src/__tests__/**/*.test.ts'],
  },
});