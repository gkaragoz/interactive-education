import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/** All files below a directory, as posix paths relative to it. */
function walk(root: string, dir = root): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(root, full) : [relative(root, full).split('\\').join('/')];
  });
}

/**
 * Fills the placeholders of `public/sw.js` after the build: a build id derived from the output (so every deploy gets
 * its own cache), the app shell to precache, and the extra files to precache after the first idle moment
 * (models, the low texture tier, micrographs). The medium and high texture tiers are cached when they are first used.
 */
export function serviceWorkerPlugin(): Plugin {
  let outDir = 'dist';
  return {
    name: 'bilim-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const swPath = join(outDir, 'sw.js');
      if (!existsSync(swPath)) return;
      const files = walk(outDir).filter((f) => f !== 'sw.js');
      const shell = ['./', ...files.filter((f) => f === 'index.html' || /^(assets|basis)\//.test(f))];
      const extra = files.filter((f) => /^models\/.+\.(glb|json)$/.test(f) || /^textures\/[^/]+\/low\//.test(f) || /^micrographs\//.test(f));
      const id = createHash('sha1')
        .update(files.map((f) => `${f}:${statSync(join(outDir, f)).size}`).join('|'))
        .digest('hex')
        .slice(0, 12);
      const source = readFileSync(swPath, 'utf8')
        .replace('__BUILD_ID__', id)
        .replace('/* __SHELL__ */ []', JSON.stringify(shell))
        .replace('/* __EXTRA__ */ []', JSON.stringify(extra));
      writeFileSync(swPath, source);
    },
  };
}

// Relative base: the same build works at the root (dev, preview) and under the GitHub Pages sub-path (/interactive-education/).
export default defineConfig({
  base: './',
  plugins: [serviceWorkerPlugin()],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // three.js (renderer, loaders, post-processing) is only needed by the 3D screens; the home page loads without it.
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'three';
          if (id.includes('node_modules/@fontsource')) return 'fonts';
          return undefined;
        },
      },
    },
  },
});
