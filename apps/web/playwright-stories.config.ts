// Biome cannot follow `devices` through @playwright/test's re-export, so the
// config imports it at run time like the a11y config factory does.
const { defineConfig, devices } = await import('@playwright/test');

// The a11y suite owns 3160; the gallery takes its neighbour and fails if it is taken.
const galleryPort = 3161;
const galleryUrl = `http://127.0.0.1:${galleryPort}/playwright/gallery/index.html`;

export default defineConfig({
  testDir: './src',
  testMatch: '**/*.story-test.ts',
  // The a11y run clears test-results when it starts, and the two suites run in parallel.
  outputDir: 'playwright/test-results',
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  use: {
    baseURL: galleryUrl,
    reuseContext: true,
    serviceWorkers: 'block',
  },
  webServer: {
    command: `./node_modules/.bin/vite --config playwright/vite.config.ts --host 127.0.0.1 --port ${galleryPort} --strictPort`,
    url: galleryUrl,
    // Never reuse a gallery another checkout serves on this port.
    reuseExistingServer: false,
  },
});
