export type ApplicationCategory = 'games' | 'productivity' | 'communication' | 'utilities' | 'other';

export interface ApplicationCapabilities {
  credentials: boolean;
  sessions: boolean;
  multipleInstances: boolean;
  accountIdentification: boolean;
  sessionValidation: boolean;
  manualLogin: boolean;
}

export interface Application {
  id: string;
  name: string;
  adapterId: string;
  executablePath: string | null;
  installPath: string | null;
  iconPath: string | null;
  category: ApplicationCategory;
  isFavorite: boolean;
  isInstalled: boolean;
  isRunning?: boolean;
  accountCount?: number;
  capabilities: ApplicationCapabilities;
  createdAt: string;
}

export interface RegisterApplicationInput {
  name: string;
  adapterId?: string;
  executablePath: string;
  installPath?: string;
  iconPath?: string;
  category?: ApplicationCategory;
  isFavorite?: boolean;
}

export interface UpdateApplicationInput {
  name?: string;
  executablePath?: string;
  installPath?: string;
  iconPath?: string;
  category?: ApplicationCategory;
  isFavorite?: boolean;
}
