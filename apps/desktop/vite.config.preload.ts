import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    ssr: true,
    target: 'node22',
    outDir: 'dist-electron/preload',
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/preload/index.ts'),
      output: {
        entryFileNames: 'index.js',
        format: 'cjs',
      },
      external: [
        'electron',
        'node:electron',
      ],
    },
  },
  ssr: {
    noExternal: true,
  },
});
