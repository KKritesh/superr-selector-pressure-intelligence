import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: './', plugins: [react()],
  build: { chunkSizeWarningLimit: 650 },
  test: { environment: 'jsdom', globals: true, setupFiles: ['tests/setup.ts'], exclude: ['tests/browser/**', '**/node_modules/**', '**/dist/**'] },
});
