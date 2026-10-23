import { defineConfig } from '@playwright/test';

// `npm run e2e` runs everything in one go against the production build served by `vite preview`.
// SwiftShader (software WebGL) keeps the tests independent of a GPU; it is slow, so tests use quality=low and
// every test gets a generous timeout. Two projects: the explorer/framework smoke tests and the per-module specs.
// Run one project with `npx playwright test --project=modules`; `E2E_GPU=1` uses the real GPU (d3d11) instead.
const gpu = process.env.E2E_GPU === '1';
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173/',
    viewport: { width: 1600, height: 960 },
    launchOptions: { args: gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  projects: [
    { name: 'smoke', testMatch: /smoke\.spec\.ts/, use: { browserName: 'chromium' } },
    { name: 'modules', testIgnore: /smoke\.spec\.ts/, testMatch: /\.spec\.ts/, use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: true,
    timeout: 240_000,
  },
});
