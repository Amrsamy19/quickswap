import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { AppError } from '@quickswap/shared';

/**
 * Validates that an IPC invocation originates from a trusted local application frame.
 * Rejects requests from foreign origins, dev tools, or unauthorized child frames.
 */
export function assertValidIpcSender(event: IpcMainInvokeEvent): void {
  const frame = event.senderFrame;
  if (!frame) {
    throw new AppError('UNAUTHORIZED_IPC', 'IPC call rejected: missing sender frame.');
  }

  const url = frame.url;
  if (!url) {
    throw new AppError('UNAUTHORIZED_IPC', 'IPC call rejected: empty sender frame URL.');
  }

  const devUrl = process.env.ELECTRON_RENDERER_URL || process.env.VITE_DEV_SERVER_URL;
  const isDevOrigin = Boolean(devUrl && url.startsWith(devUrl));
  const isLocalhostDev = url.startsWith('http://localhost:5173') || url.startsWith('http://127.0.0.1:5173');
  const isFileOrigin = url.startsWith('file://');

  if (!isDevOrigin && !isLocalhostDev && !isFileOrigin) {
    throw new AppError(
      'UNAUTHORIZED_IPC',
      `IPC call rejected: untrusted origin "${url}". Requests must originate from the Quickswap application.`
    );
  }
}

/**
 * Registers an IPC handler that validates the sender frame before executing.
 */
export function secureHandle(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any
): void {
  ipcMain.handle(channel, async (event, ...args) => {
    assertValidIpcSender(event);
    return handler(event, ...args);
  });
}
