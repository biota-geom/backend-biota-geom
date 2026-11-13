export const ALERT_TYPES = ['LICENSE_EXPIRATION', 'CONDITION_DUE'] as const;
export type AlertType = (typeof ALERT_TYPES)[number];
export const ALERT_STATUSES = ['OPEN', 'READ', 'RESOLVED'] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  dueDate: Date;
  createdAt: Date;
  customer: { id: string; name: string };
  license: { id: string; type: string; processNumber: string };
  condition: { id: string; name: string } | null;
}

export interface AlertPage {
  items: Alert[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListAlertsQuery {
  status: AlertStatus[];
  page: number;
  pageSize: number;
}
