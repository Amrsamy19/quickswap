import { SettingsRepository } from '@quickswap/database';
import { AppSettings, UpdateSettingsInput, UpdateSettingsSchema } from '@quickswap/shared';

export class AppSettingsService {
  public static get(): AppSettings {
    return SettingsRepository.getSettings();
  }

  public static update(input: UpdateSettingsInput): AppSettings {
    const validated = UpdateSettingsSchema.parse(input);
    return SettingsRepository.updateSettings(validated);
  }
}
