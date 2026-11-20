import { z } from 'zod';

export const ApplicationCategorySchema = z.enum([
  'games',
  'productivity',
  'communication',
  'utilities',
  'other',
]);

export const RegisterApplicationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  adapterId: z.string().max(50).default('generic'),
  executablePath: z.string().min(1, 'Executable path is required'),
  installPath: z.string().optional(),
  iconPath: z.string().optional(),
  category: ApplicationCategorySchema.default('games'),
  isFavorite: z.boolean().default(false),
});

export const UpdateApplicationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  executablePath: z.string().min(1).optional(),
  installPath: z.string().optional(),
  iconPath: z.string().optional(),
  category: ApplicationCategorySchema.optional(),
  isFavorite: z.boolean().optional(),
});

export const AuthMethodSchema = z.enum(['credentials', 'session', 'hybrid', 'manual']);

export const CreateAccountSchema = z.object({
  applicationId: z.string().min(1, 'Application ID is required'),
  displayName: z.string().min(1, 'Account display name is required').max(100),
  username: z.string().max(100).optional().nullable(),
  password: z.string().max(500).optional().nullable(),
  region: z.string().max(50).optional().nullable(),
  avatar: z.string().optional().nullable(),
  authMethod: AuthMethodSchema.default('credentials'),
  isFavorite: z.boolean().default(false),
  isDefault: z.boolean().default(false),
  launchArguments: z.string().max(1000).optional().nullable(),
});

export const UpdateAccountSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  username: z.string().max(100).optional().nullable(),
  password: z.string().max(500).optional().nullable(),
  region: z.string().max(50).optional().nullable(),
  avatar: z.string().optional().nullable(),
  authMethod: AuthMethodSchema.optional(),
  isFavorite: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  launchArguments: z.string().max(1000).optional().nullable(),
});

export const AccountFilterSchema = z.object({
  applicationId: z.string().optional(),
  query: z.string().optional(),
  favoritesOnly: z.boolean().optional(),
  authMethod: AuthMethodSchema.optional(),
});

export const UpdateSettingsSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']).optional(),
  startWithWindows: z.boolean().optional(),
  minimizeToTray: z.boolean().optional(),
  startMinimized: z.boolean().optional(),
  autoLockMinutes: z.number().int().min(0).max(1440).optional(),
  enableAuditLog: z.boolean().optional(),
  backupPath: z.string().nullable().optional(),
});

export const SetMasterPasswordSchema = z.object({
  password: z.string().min(4, 'Master password must be at least 4 characters long').max(200),
});

export const UnlockVaultSchema = z.object({
  password: z.string().min(1, 'Password is required').max(200),
});

export const RemoveMasterPasswordSchema = z.object({
  password: z.string().min(1, 'Current password is required to remove master password').max(200),
});
