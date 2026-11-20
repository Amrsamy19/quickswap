import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    fileParallelism: false,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@quickswap/shared': path.resolve(__dirname, 'packages/shared/src'),
      '@quickswap/database': path.resolve(__dirname, 'packages/database/src'),
      '@quickswap/security': path.resolve(__dirname, 'packages/security/src'),
      '@quickswap/core': path.resolve(__dirname, 'packages/core/src'),
      '@accounthub/shared': path.resolve(__dirname, 'packages/shared/src'),
      '@accounthub/database': path.resolve(__dirname, 'packages/database/src'),
      '@accounthub/security': path.resolve(__dirname, 'packages/security/src'),
      '@accounthub/core': path.resolve(__dirname, 'packages/core/src'),
    },
  },
});
