import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    ssr: true,
    target: 'node22',
    outDir: 'dist-electron/main',
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/main/index.ts'),
      output: {
        entryFileNames: 'index.js',
        format: 'cjs',
        inlineDynamicImports: true,
      },
      external: [
        'electron',
        'electron-updater',
        'node:sqlite',
        'node:crypto',
        'node:fs',
        'node:path',
        'node:child_process',
        'node:https',
        'sqlite',
        'fs',
        'path',
        'child_process',
        'crypto',
        'https',
      ],
    },
  },
});
