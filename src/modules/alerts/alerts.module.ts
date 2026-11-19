import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AlertsRepository } from './domain/alerts.repository';
import { PrismaAlertRepository } from './infra/prisma-alert.repository';
import { AlertResolver } from './domain/alert-resolver';
import { PrismaAlertResolver } from './infra/prisma-alert-resolver';
import { ListAlertsUseCase } from './application/list-alerts.use-case';
import { CountUnreadAlertsUseCase } from './application/count-unread-alerts.use-case';
import { UpdateAlertStatusUseCase } from './application/update-alert-status.use-case';
import { AlertsController } from './presentation/alerts.controller';

@Module({
  imports: [AuthModule],
  controllers: [AlertsController],
  providers: [
    { provide: AlertsRepository, useClass: PrismaAlertRepository },
    { provide: AlertResolver, useClass: PrismaAlertResolver },
    ListAlertsUseCase,
    CountUnreadAlertsUseCase,
    UpdateAlertStatusUseCase,
  ],
  exports: [AlertsRepository, AlertResolver],
})
export class AlertsModule {}
