import { registerApplicationIpcHandlers } from './applications.ipc';
import { registerAccountIpcHandlers } from './accounts.ipc';
import { registerSecurityIpcHandlers } from './security.ipc';
import { registerActivityIpcHandlers, registerSettingsIpcHandlers } from './activity.ipc';

export function registerAllIpcHandlers(): void {
  registerApplicationIpcHandlers();
  registerAccountIpcHandlers();
  registerSecurityIpcHandlers();
  registerActivityIpcHandlers();
  registerSettingsIpcHandlers();
}
