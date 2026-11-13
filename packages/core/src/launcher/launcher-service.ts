import crypto from 'crypto';
import fs from 'fs';
import {
  AccountsRepository,
  ApplicationsRepository,
  LaunchHistoryRepository,
} from '@accounthub/database';
import {
  LaunchResult,
  ProcessStatus,
  LaunchHistoryEntry,
  AppError,
} from '@accounthub/shared';
import { AdapterRegistry } from '../adapters/adapter-registry';
import { ProcessMonitor } from './process-monitor';
import { ActivityService } from '../activity/service';

export class LauncherService {
  public static async launch(accountId: string, force: boolean = false): Promise<LaunchResult> {
    const account = AccountsRepository.getById(accountId);
    if (!account) {
      throw new AppError('ACCOUNT_NOT_FOUND', `Account with ID ${accountId} was not found`);
    }

    const application = ApplicationsRepository.getById(account.applicationId);
    if (!application) {
      throw new AppError(
        'APP_NOT_FOUND',
        `Parent application ${account.applicationId} was not found`
      );
    }

    if (!application.executablePath || !fs.existsSync(application.executablePath)) {
      const errMsg = `Executable not found on disk at: ${application.executablePath || 'Path unset'}`;
      LaunchHistoryRepository.create({
        id: `lh-${crypto.randomUUID()}`,
        accountId,
        applicationId: application.id,
        status: 'failed',
        errorMessage: errMsg,
      });
      throw new AppError('EXECUTABLE_NOT_FOUND', errMsg);
    }

    // 1. Check if application is already running
    const status = await ProcessMonitor.isRunning(application.executablePath);
    if (status.isRunning && !force) {
      return {
        success: false,
        alreadyRunning: true,
        pid: status.pid,
        message: `${application.name} is currently running. Please close it first to safely switch accounts.`,
      };
    }

    // 2. Parse arguments
    const args: string[] = [];
    if (account.launchArguments && account.launchArguments.trim()) {
      args.push(...account.launchArguments.trim().split(/\s+/));
    }

    // 3. Resolve adapter
    const adapter = AdapterRegistry.get(application.adapterId);

    // 4. Launch via adapter
    try {
      const result = await adapter.launch({
        accountId: account.id,
        applicationId: application.id,
        executablePath: application.executablePath,
        arguments: args,
        displayName: account.displayName,
        username: account.username,
        region: account.region,
        authMethod: account.authMethod,
      });

      // 5. Update last_used_at on account
      AccountsRepository.update(account.id, {
        lastUsedAt: new Date().toISOString(),
      });

      // 6. Record launch history
      LaunchHistoryRepository.create({
        id: `lh-${crypto.randomUUID()}`,
        accountId: account.id,
        applicationId: application.id,
        status: 'success',
      });

      // 7. Log activity
      ActivityService.log(
        'application_launched',
        'application',
        application.id,
        `Launched ${application.name}`,
        `Using account "${account.displayName}" (PID: ${result.pid || 'detached'})`
      );

      return result;
    } catch (err: any) {
      LaunchHistoryRepository.create({
        id: `lh-${crypto.randomUUID()}`,
        accountId: account.id,
        applicationId: application.id,
        status: 'failed',
        errorMessage: err.message,
      });
      throw err;
    }
  }

  public static async getStatus(applicationId: string): Promise<ProcessStatus> {
    const application = ApplicationsRepository.getById(applicationId);
    if (!application || !application.executablePath) {
      return { isRunning: false };
    }
    return ProcessMonitor.isRunning(application.executablePath);
  }

  public static getHistory(limit: number = 20): LaunchHistoryEntry[] {
    return LaunchHistoryRepository.list(limit);
  }
}
