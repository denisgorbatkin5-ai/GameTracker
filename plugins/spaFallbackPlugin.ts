import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * Static hosts have no rewrite rules: an unknown path like /u/nickname would 404 instead of
 * handing the route to React Router. Most of them (GitHub Pages included) serve 404.html for
 * those, so we drop a copy of the built index.html next to it.
 */
export function spaFallbackPlugin(): Plugin {
  return {
    name: 'gametracker:spa-fallback',
    apply: 'build',
    async closeBundle() {
      const outDir = path.resolve(process.cwd(), 'dist');
      await mkdir(outDir, { recursive: true });
      await copyFile(path.join(outDir, 'index.html'), path.join(outDir, '404.html'));
    },
  };
}
