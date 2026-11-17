import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AlertsRepository } from './domain/alerts.repository';
import { PrismaAlertRepository } from './infra/prisma-alert.repository';
import { ListAlertsUseCase } from './application/list-alerts.use-case';
import { CountUnreadAlertsUseCase } from './application/count-unread-alerts.use-case';
import { UpdateAlertStatusUseCase } from './application/update-alert-status.use-case';
import { AlertSyncRepository } from './domain/alert-sync.repository';
import { LicenseExpirationSource } from './domain/license-expiration-source';
import { ALERT_GENERATORS } from './domain/alert-generator';
import { PrismaAlertSyncRepository } from './infra/prisma-alert-sync.repository';
import { PrismaLicenseExpirationSource } from './infra/prisma-license-expiration.source';
import { SyncAlertsCron } from './infra/sync-alerts.cron';
import { LicenseExpirationAlertGenerator } from './application/license-expiration-alert.generator';
import { SyncAlertsUseCase } from './application/sync-alerts.use-case';
import { AlertsController } from './presentation/alerts.controller';

@Module({
  imports: [AuthModule],
  controllers: [AlertsController],
  providers: [
    { provide: AlertsRepository, useClass: PrismaAlertRepository },
    ListAlertsUseCase,
    CountUnreadAlertsUseCase,
    UpdateAlertStatusUseCase,
    { provide: AlertSyncRepository, useClass: PrismaAlertSyncRepository },
    {
      provide: LicenseExpirationSource,
      useClass: PrismaLicenseExpirationSource,
    },
    LicenseExpirationAlertGenerator,
    // Add new generators (e.g. conditions) to this list.
    {
      provide: ALERT_GENERATORS,
      useFactory: (licenses: LicenseExpirationAlertGenerator) => [licenses],
      inject: [LicenseExpirationAlertGenerator],
    },
    SyncAlertsUseCase,
    SyncAlertsCron,
  ],
  exports: [AlertsRepository],
})
export class AlertsModule {}
