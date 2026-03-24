import { defineConfig } from 'vite';
import { resolve } from 'path';
import { cpSync } from 'fs';

export default defineConfig({
  root: 'src/browser',
  base: '/void-transit/',
  publicDir: resolve(__dirname, 'src/browser/public'),
  build: {
    outDir: '../../docs',
    emptyOutDir: true,
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: resolve(__dirname, 'src/browser/index.html'),
    },
  },
  define: {
    'process.env': '{}',
    '__dirname': '""',
  },
  resolve: {
    alias: {
      'child_process': resolve(__dirname, 'src/browser/stubs/empty.ts'),
      'fs': resolve(__dirname, 'src/browser/stubs/empty.ts'),
      'path': resolve(__dirname, 'src/browser/stubs/path.ts'),
    },
  },
  plugins: [{
    name: 'copy-audio',
    closeBundle() {
      cpSync(resolve(__dirname, 'src/frontend/audio.js'), resolve(__dirname, 'docs/audio.js'));
    },
  }],
});
