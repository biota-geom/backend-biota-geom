import { Inject, Injectable } from '@nestjs/common';
import {
  ALERT_GENERATORS,
  AlertGenerator,
  AlertSyncScope,
} from '../domain/alert-generator';
import { AlertSyncRepository } from '../domain/alert-sync.repository';

export interface SyncAlertsResult {
  created: number;
  resolved: number;
}

@Injectable()
export class SyncAlertsUseCase {
  constructor(
    @Inject(ALERT_GENERATORS) private readonly generators: AlertGenerator[],
    private readonly repository: AlertSyncRepository,
  ) {}

  async execute(
    scope: AlertSyncScope = {},
    now: Date = new Date(),
  ): Promise<SyncAlertsResult> {
    const result = { created: 0, resolved: 0 };
    for (const generator of this.generators) {
      const desired = await generator.generate(scope, now);
      result.created += await this.repository.createMissing(desired);
      result.resolved += await this.repository.resolveStale(
        scope,
        generator.type,
        desired.map((alert) => alert.dedupeKey),
      );
    }
    return result;
  }
}
