/// <reference types="vite/client" />
import { QuickswapAPI } from '@quickswap/shared';

declare global {
  interface Window {
    quickswapAPI?: QuickswapAPI;
    accountHubAPI?: QuickswapAPI;
  }
}

declare module '*.css';

export {};
