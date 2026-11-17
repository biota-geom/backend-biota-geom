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
import { ConditionDueAlertGenerator } from './application/condition-due-alert.generator';
import { SyncAlertsUseCase } from './application/sync-alerts.use-case';
import { ConditionDueSource } from './domain/condition-due-source';
import { PrismaConditionDueSource } from './infra/prisma-condition-due.source';
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
    { provide: ConditionDueSource, useClass: PrismaConditionDueSource },
    ConditionDueAlertGenerator,
    // Add new generators to this list.
    {
      provide: ALERT_GENERATORS,
      useFactory: (
        licenses: LicenseExpirationAlertGenerator,
        conditions: ConditionDueAlertGenerator,
      ) => [licenses, conditions],
      inject: [LicenseExpirationAlertGenerator, ConditionDueAlertGenerator],
    },
    SyncAlertsUseCase,
    SyncAlertsCron,
  ],
  exports: [AlertsRepository],
})
export class AlertsModule {}
