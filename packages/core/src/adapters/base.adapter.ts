import { ApplicationCapabilities, LaunchResult } from '@quickswap/shared';

export interface LaunchContext {
  accountId: string;
  applicationId: string;
  executablePath: string;
  arguments?: string[];
  displayName: string;
  username?: string | null;
  region?: string | null;
  authMethod: string;
}

export interface ApplicationAdapter {
  id: string;
  name: string;
  capabilities: ApplicationCapabilities;

  detectInstallation(): Promise<boolean>;
  getExecutablePath(): Promise<string | null>;
  getRunningStatus(executablePath: string): Promise<boolean>;
  launch(context: LaunchContext): Promise<LaunchResult>;
}
