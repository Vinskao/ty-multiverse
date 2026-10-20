/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@astrojs/react';

export default defineConfig({
  plugins: [react()],
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});

