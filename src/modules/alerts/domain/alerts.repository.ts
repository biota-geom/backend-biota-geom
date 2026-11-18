import { Alert, AlertPage, AlertStatus, ListAlertsQuery } from './alert.entity';

export abstract class AlertsRepository {
  abstract list(
    ownerUserId: string,
    query: ListAlertsQuery,
  ): Promise<AlertPage>;
  abstract countUnread(ownerUserId: string): Promise<number>;
  abstract updateStatus(
    ownerUserId: string,
    id: string,
    status: Exclude<AlertStatus, 'OPEN'>,
  ): Promise<Alert | null>;
}
