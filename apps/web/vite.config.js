import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:3001';
// Derive paths from this config file so builds do not depend on the caller's cwd.
const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const srcDir = fileURLToPath(new URL('./src', import.meta.url));
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  root: projectRoot,
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      '@': srcDir,
    },
  },
  server: {
    fs: {
      allow: [repoRoot],
    },
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
});
