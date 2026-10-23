import { defineConfig } from 'vite';

// Relative base: the same build works at the root (dev, preview) and under the GitHub Pages sub-path (/interactive-education/).
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 900 },
});
