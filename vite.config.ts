import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // tanstackRouter MUST be before react() plugin
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
  ],
  test: {
    // See test/setup/jsdom-storage.ts: works around Node's built-in
    // `localStorage` shadowing jsdom's real Storage implementation.
    setupFiles: ['./test/setup/jsdom-storage.ts'],
  },
});
