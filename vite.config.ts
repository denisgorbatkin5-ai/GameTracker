import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { steamApiPlugin } from './plugins/steamApiPlugin';
import { spaFallbackPlugin } from './plugins/spaFallbackPlugin';

export default defineConfig({
  // Vercel serves from the root; static hosts (GitHub Pages) live under a subpath,
  // which the deploy workflow passes through VITE_BASE_PATH.
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), steamApiPlugin(), spaFallbackPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2022',
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
