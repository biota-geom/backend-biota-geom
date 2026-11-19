import { InvalidConditionAlertDateError } from './errors/invalid-condition-alert-date.error';

/*
 * The alert date is an optional reminder for the operator, so it must fall
 * on or before the condition due date. A missing date on either side has
 * nothing to compare against and is accepted.
 */
export function assertAlertDateNotAfterDueDate(
  alertDate: Date | null | undefined,
  dueDate: Date | null | undefined,
): void {
  if (!alertDate || !dueDate) return;
  if (alertDate.getTime() > dueDate.getTime()) {
    throw new InvalidConditionAlertDateError();
  }
}
