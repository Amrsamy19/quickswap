import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    fileParallelism: false,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@accounthub/shared': path.resolve(__dirname, 'packages/shared/src'),
      '@accounthub/database': path.resolve(__dirname, 'packages/database/src'),
      '@accounthub/security': path.resolve(__dirname, 'packages/security/src'),
      '@accounthub/core': path.resolve(__dirname, 'packages/core/src'),
    },
  },
});
