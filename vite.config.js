import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Two pages: flight (index.html) and the Jezero colony (colony.html).
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        colony: resolve(import.meta.dirname, 'colony.html')
      }
    }
  }
});
