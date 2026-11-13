import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    ssr: true,
    target: 'node22',
    outDir: 'dist-electron',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        'main/index': path.resolve(__dirname, 'src/main/index.ts'),
        'preload/index': path.resolve(__dirname, 'src/preload/index.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        format: 'cjs',
      },
      external: [
        'electron',
        'node:sqlite',
        'node:crypto',
        'node:fs',
        'node:path',
        'node:child_process',
        'sqlite',
        'fs',
        'path',
        'child_process',
        'crypto',
      ],
    },
  },
});
