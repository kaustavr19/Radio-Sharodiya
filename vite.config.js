import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        app: resolve(import.meta.dirname, 'index.html'),
        betaAdmin: resolve(import.meta.dirname, 'beta-admin.html'),
      },
    },
  },
});
