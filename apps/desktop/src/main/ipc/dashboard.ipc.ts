import { ipcMain } from 'electron';
import { DashboardService } from '@quickswap/core';
import { IPC_CHANNELS } from '@quickswap/shared';

export function registerDashboardIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.DASHBOARD_GET_SUMMARY, async () => {
    return DashboardService.getSummary();
  });
}
