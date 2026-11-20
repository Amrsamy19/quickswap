import { DashboardService } from '@quickswap/core';
import { IPC_CHANNELS } from '@quickswap/shared';
import { secureHandle } from './ipc-security';

export function registerDashboardIpcHandlers(): void {
  secureHandle(IPC_CHANNELS.DASHBOARD_GET_SUMMARY, async () => {
    return DashboardService.getSummary();
  });
}
