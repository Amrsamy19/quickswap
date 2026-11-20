import { ApplicationService } from '../applications/service';
import { AccountService } from '../accounts/service';
import { CoreSecurityService } from '../security/service';
import { ActivityService } from '../activity/service';
import { AppSettingsService } from '../settings/service';
import { DashboardSummary } from '@quickswap/shared';

export class DashboardService {
  /**
   * High performance single-batch query retrieving all initial dashboard state in one round trip.
   */
  public static async getSummary(): Promise<DashboardSummary> {
    const [applications, accounts, securityStatus, credentials, activities, settings] = await Promise.all([
      ApplicationService.list(),
      AccountService.list(),
      CoreSecurityService.getStatus(),
      CoreSecurityService.listStoredCredentials(),
      ActivityService.list(50),
      AppSettingsService.get(),
    ]);

    return {
      applications,
      accounts,
      securityStatus,
      credentials,
      activities,
      settings,
    };
  }
}
