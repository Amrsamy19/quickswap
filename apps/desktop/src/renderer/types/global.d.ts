import { AccountHubAPI } from '@accounthub/shared';

declare global {
  interface Window {
    accountHubAPI: AccountHubAPI;
  }
}

export {};
