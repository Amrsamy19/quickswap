import crypto from 'crypto';
import fs from 'fs';
import { ApplicationsRepository } from '@quickswap/database';
import {
  Application,
  RegisterApplicationInput,
  UpdateApplicationInput,
  AppError,
  RegisterApplicationSchema,
  UpdateApplicationSchema,
} from '@quickswap/shared';
import { ApplicationDetector } from './detector';
import { ActivityService } from '../activity/service';

export class ApplicationService {
  public static list(): Application[] {
    return ApplicationsRepository.list();
  }

  public static getById(id: string): Application | null {
    return ApplicationsRepository.getById(id);
  }

  public static async detectInstalled(): Promise<Application[]> {
    const detected = await ApplicationDetector.scanInstalledApplications();
    const existing = ApplicationsRepository.list();
    const existingIds = new Set(existing.map((a) => a.id));

    for (const app of detected) {
      if (!existingIds.has(app.id)) {
        ApplicationsRepository.create({
          id: app.id,
          name: app.name,
          adapterId: app.adapterId,
          executablePath: app.executablePath,
          installPath: app.installPath,
          category: app.category,
          isFavorite: false,
        });

        ActivityService.log(
          'application_registered',
          'application',
          app.id,
          `Detected application: ${app.name}`,
          `Found at ${app.executablePath}`
        );
      }
    }

    return ApplicationsRepository.list();
  }

  public static register(input: RegisterApplicationInput): Application {
    const validated = RegisterApplicationSchema.parse(input);

    if (!fs.existsSync(validated.executablePath)) {
      throw new AppError(
        'EXECUTABLE_NOT_FOUND',
        `The executable was not found at path: ${validated.executablePath}`
      );
    }

    const id = `app-${crypto.randomUUID().slice(0, 8)}`;
    ApplicationsRepository.create({
      id,
      name: validated.name,
      adapterId: validated.adapterId,
      executablePath: validated.executablePath,
      installPath: validated.installPath || null,
      iconPath: validated.iconPath || null,
      category: validated.category,
      isFavorite: validated.isFavorite,
    });

    ActivityService.log(
      'application_registered',
      'application',
      id,
      `Registered application: ${validated.name}`,
      `Path: ${validated.executablePath}`
    );

    const created = ApplicationsRepository.getById(id);
    if (!created) {
      throw new AppError('DATABASE_ERROR', 'Failed to retrieve registered application');
    }
    return created;
  }

  public static update(id: string, input: UpdateApplicationInput): Application {
    const validated = UpdateApplicationSchema.parse(input);
    const existing = ApplicationsRepository.getById(id);
    if (!existing) {
      throw new AppError('APP_NOT_FOUND', `Application with ID ${id} was not found`);
    }

    if (validated.executablePath && !fs.existsSync(validated.executablePath)) {
      throw new AppError(
        'EXECUTABLE_NOT_FOUND',
        `Executable not found at path: ${validated.executablePath}`
      );
    }

    ApplicationsRepository.update(id, validated);
    ActivityService.log(
      'application_updated',
      'application',
      id,
      `Updated application: ${validated.name || existing.name}`
    );

    return ApplicationsRepository.getById(id)!;
  }

  public static remove(id: string): void {
    const existing = ApplicationsRepository.getById(id);
    if (!existing) {
      throw new AppError('APP_NOT_FOUND', `Application with ID ${id} was not found`);
    }

    ApplicationsRepository.delete(id);
    ActivityService.log(
      'application_removed',
      'application',
      id,
      `Removed application: ${existing.name}`
    );
  }
}
