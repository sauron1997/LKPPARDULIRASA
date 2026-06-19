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
  build: {
    rollupOptions: {
      output: {
        // Split vendor code into separate chunks for better caching and faster initial loads.
        // Public pages (LandingPage, BlogPage) shouldn't pay the cost of admin-only code.
        // Uses function form because Vite 8 / Rolldown requires manualChunks to be a function.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('@tanstack')) {
              return 'vendor-tanstack';
            }
            if (id.includes('react-hook-form') || id.includes('react-helmet-async')) {
              return 'vendor-form';
            }
            if (id.includes('@tiptap')) {
              return 'vendor-tiptap';
            }
            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
          }
        },
      },
    },
  },
});
