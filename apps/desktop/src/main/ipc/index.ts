import { registerApplicationIpcHandlers } from './applications.ipc';
import { registerAccountIpcHandlers } from './accounts.ipc';
import { registerSecurityIpcHandlers } from './security.ipc';
import { registerActivityIpcHandlers, registerSettingsIpcHandlers } from './activity.ipc';
import { registerLauncherIpcHandlers } from './launcher.ipc';
import { registerDashboardIpcHandlers } from './dashboard.ipc';
import { registerWindowIpcHandlers } from './window.ipc';
import { registerBackupAndMigrationIpcHandlers } from './backup.ipc';
import { registerUpdaterIpcHandlers } from './updater.ipc';

export function registerAllIpcHandlers(): void {
  registerApplicationIpcHandlers();
  registerAccountIpcHandlers();
  registerSecurityIpcHandlers();
  registerActivityIpcHandlers();
  registerSettingsIpcHandlers();
  registerLauncherIpcHandlers();
  registerDashboardIpcHandlers();
  registerWindowIpcHandlers();
  registerBackupAndMigrationIpcHandlers();
  registerUpdaterIpcHandlers();
}
