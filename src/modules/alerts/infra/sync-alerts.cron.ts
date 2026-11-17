import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SyncAlertsUseCase } from '../application/sync-alerts.use-case';

export const SYNC_ALERTS_CRON = '0 6 * * *';
export const SYNC_ALERTS_TIME_ZONE = 'America/Sao_Paulo';

@Injectable()
export class SyncAlertsCron implements OnModuleInit {
  private readonly logger = new Logger(SyncAlertsCron.name);

  constructor(private readonly syncAlerts: SyncAlertsUseCase) {}

  onModuleInit() {
    this.logger.log(
      `Registered job alerts-sync (${SYNC_ALERTS_CRON}, ${SYNC_ALERTS_TIME_ZONE})`,
    );
  }

  @Cron(SYNC_ALERTS_CRON, {
    name: 'alerts-sync',
    timeZone: SYNC_ALERTS_TIME_ZONE,
  })
  async run() {
    try {
      const result = await this.syncAlerts.execute();
      this.logger.log(
        `alerts-sync done: ${result.created} created, ${result.resolved} resolved`,
      );
    } catch (error) {
      this.logger.error(
        'alerts-sync failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
