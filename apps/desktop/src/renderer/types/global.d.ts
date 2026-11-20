import { QuickswapAPI } from '@quickswap/shared';

declare global {
  interface Window {
    quickswapAPI?: QuickswapAPI;
    accountHubAPI?: QuickswapAPI;
  }
}

export {};
