import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@quickswap/shared';

export function registerWindowIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    if (win.isMaximized()) {
      win.unmaximize();
      return false;
    } else {
      win.maximize();
      return true;
    }
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win?.isMaximized() ?? false;
  });
}
