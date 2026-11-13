import crypto from 'crypto';
import { ActivityLogRepository, SettingsRepository } from '@accounthub/database';
import { ActivityAction, ActivityEntityType, ActivityLogEntry } from '@accounthub/shared';
import { SecuritySanitizer } from '@accounthub/security';

export class ActivityService {
  public static log(
    action: ActivityAction,
    entityType: ActivityEntityType,
    entityId: string | null,
    title: string,
    details?: string | null
  ): void {
    const settings = SettingsRepository.getSettings();
    if (!settings.enableAuditLog) return;

    const id = `act-${crypto.randomUUID()}`;
    const sanitizedDetails = details ? String(SecuritySanitizer.sanitize(details)) : null;

    ActivityLogRepository.create({
      id,
      action,
      entityType,
      entityId,
      title,
      details: sanitizedDetails,
    });
  }

  public static list(limit: number = 50): ActivityLogEntry[] {
    return ActivityLogRepository.list(limit);
  }

  public static clear(): void {
    ActivityLogRepository.clear();
  }
}
