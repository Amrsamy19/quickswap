export const APP_NAME = 'AccountHub';
export const CREDENTIAL_TARGET_PREFIX = 'AccountHub';
export const DEFAULT_DATABASE_NAME = 'accounthub.db';

export const RIOT_REGIONS = [
  { id: 'NA', name: 'North America (NA)' },
  { id: 'EUW', name: 'Europe West (EUW)' },
  { id: 'EUNE', name: 'Europe Nordic & East (EUNE)' },
  { id: 'KR', name: 'Korea (KR)' },
  { id: 'JP', name: 'Japan (JP)' },
  { id: 'BR', name: 'Brazil (BR)' },
  { id: 'LAN', name: 'Latin America North (LAN)' },
  { id: 'LAS', name: 'Latin America South (LAS)' },
  { id: 'OCE', name: 'Oceania (OCE)' },
  { id: 'TR', name: 'Turkey (TR)' },
  { id: 'RU', name: 'Russia (RU)' },
  { id: 'SG', name: 'Southeast Asia (SG)' },
  { id: 'PBE', name: 'Public Beta Environment (PBE)' },
];

export const IPC_CHANNELS = {
  APPLICATIONS_LIST: 'applications:list',
  APPLICATIONS_DETECT: 'applications:detect',
  APPLICATIONS_REGISTER: 'applications:register',
  APPLICATIONS_UPDATE: 'applications:update',
  APPLICATIONS_REMOVE: 'applications:remove',
  APPLICATIONS_GET_BY_ID: 'applications:getById',

  ACCOUNTS_LIST: 'accounts:list',
  ACCOUNTS_GET_BY_ID: 'accounts:getById',
  ACCOUNTS_CREATE: 'accounts:create',
  ACCOUNTS_UPDATE: 'accounts:update',
  ACCOUNTS_DELETE: 'accounts:delete',
  ACCOUNTS_SET_DEFAULT: 'accounts:setDefault',
  ACCOUNTS_TOGGLE_FAVORITE: 'accounts:toggleFavorite',
  ACCOUNTS_COPY_PASSWORD: 'accounts:copyPassword',

  SECURITY_GET_STATUS: 'security:getStatus',
  SECURITY_LIST_CREDENTIALS: 'security:listStoredCredentials',
  SECURITY_VERIFY_INTEGRITY: 'security:verifyIntegrity',

  LAUNCHER_LAUNCH: 'launcher:launch',
  LAUNCHER_GET_STATUS: 'launcher:getStatus',
  LAUNCHER_GET_HISTORY: 'launcher:getHistory',
  LAUNCHER_CAPTURE_SESSION: 'launcher:captureSession',
  LAUNCHER_HAS_SESSION: 'launcher:hasSession',
  LAUNCHER_CLEAR_SESSION: 'launcher:clearSession',
  LAUNCHER_AUTO_LOGIN: 'launcher:autoLogin',

  ACTIVITY_LIST: 'activity:list',
  ACTIVITY_CLEAR: 'activity:clear',

  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
} as const;
