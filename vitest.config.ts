import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: { testTimeout: 30_000, exclude: [...configDefaults.exclude, '.claude/**', 'tests/e2e/**'] },
});
