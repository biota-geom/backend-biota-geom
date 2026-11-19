import { AlertType } from './alert.entity';
import { AlertSyncScope, DesiredAlert } from './alert-generator';

export abstract class AlertSyncRepository {
  /** Inserts alerts whose dedupeKey is new. Returns how many were created. */
  abstract createMissing(alerts: DesiredAlert[]): Promise<number>;
  /** Resolves OPEN/READ alerts of the type whose dedupeKey is not kept. */
  abstract resolveStale(
    scope: AlertSyncScope,
    type: AlertType,
    keepDedupeKeys: string[],
  ): Promise<number>;
}
