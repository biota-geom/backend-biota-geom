import { AlertSeverity, AlertType } from './alert.entity';

export function alertDedupeKey(
  type: AlertType,
  recordId: string,
  severity: AlertSeverity,
  dueDate: Date,
): string {
  return `${type}:${recordId}:${severity}:${dueDate.toISOString().slice(0, 10)}`;
}
