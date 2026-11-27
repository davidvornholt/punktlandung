import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/*
 * Serves only the story gallery for `test:stories`, from the app root. It
 * resolves `#/` and builds Tailwind with the same settings as the app's
 * vite.config.ts. It leaves out TanStack Start, which renders routes rather
 * than standalone pages, and the devtools plugin, which injects code into
 * every `createRoot` entry.
 */
export default defineConfig({
  // Its own dependency cache: sharing the app's lets a running dev server and
  // the gallery overwrite each other's optimized dependencies, and the gallery
  // then answers 504 for every story that imports the router.
  cacheDir: 'node_modules/.vite-gallery',
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), viteReact()],
});
