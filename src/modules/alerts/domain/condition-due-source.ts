import { AlertSyncScope } from './alert-generator';

export interface ConditionForAlert {
  id: string;
  licenseId: string;
  customerId: string;
  dueDate: Date;
  alertDate: Date | null;
}

export abstract class ConditionDueSource {
  /**
   * Conditions not yet fulfilled, of non-archived licenses of non-deleted
   * customers in scope.
   */
  abstract list(scope: AlertSyncScope): Promise<ConditionForAlert[]>;
}
