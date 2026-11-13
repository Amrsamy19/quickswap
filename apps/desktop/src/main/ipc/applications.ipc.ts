import { ipcMain } from 'electron';
import { ApplicationService } from '@accounthub/core';
import {
  IPC_CHANNELS,
  RegisterApplicationInput,
  UpdateApplicationInput,
} from '@accounthub/shared';

export function registerApplicationIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.APPLICATIONS_LIST, async () => {
    return ApplicationService.list();
  });

  ipcMain.handle(IPC_CHANNELS.APPLICATIONS_DETECT, async () => {
    return ApplicationService.detectInstalled();
  });

  ipcMain.handle(
    IPC_CHANNELS.APPLICATIONS_REGISTER,
    async (_event, input: RegisterApplicationInput) => {
      return ApplicationService.register(input);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.APPLICATIONS_UPDATE,
    async (_event, id: string, input: UpdateApplicationInput) => {
      return ApplicationService.update(id, input);
    }
  );

  ipcMain.handle(IPC_CHANNELS.APPLICATIONS_REMOVE, async (_event, id: string) => {
    return ApplicationService.remove(id);
  });

  ipcMain.handle(IPC_CHANNELS.APPLICATIONS_GET_BY_ID, async (_event, id: string) => {
    return ApplicationService.getById(id);
  });
}
