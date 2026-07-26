import { defineConfig, devices } from '@playwright/experimental-ct-react';

const appSource = new URL('./src', import.meta.url).pathname;

// biome-ignore lint/style/noDefaultExport: Playwright discovers this required configuration through its default export.
export default defineConfig({
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  testDir: './src',
  testMatch: '**/*.ct.tsx',
  use: {
    ctCacheDir: 'test-results/playwright-ct-cache',
    ctViteConfig: {
      resolve: {
        alias: {
          '#': appSource,
        },
      },
    },
  },
});
