import { AlertSeverity, AlertType } from './alert.entity';

/** Limits a sync run; no owner means every customer. */
export interface AlertSyncScope {
  ownerUserId?: string;
}

export interface DesiredAlert {
  type: AlertType;
  severity: AlertSeverity;
  dedupeKey: string;
  dueDate: Date;
  customerId: string;
  licenseId: string;
  licenseConditionId: string | null;
}

/**
 * One step of the daily sync. It returns every alert that should be open for
 * its `type` right now; open alerts of that type not returned are resolved.
 */
export interface AlertGenerator {
  readonly type: AlertType;
  generate(scope: AlertSyncScope, now: Date): Promise<DesiredAlert[]>;
}

export const ALERT_GENERATORS = Symbol('ALERT_GENERATORS');
