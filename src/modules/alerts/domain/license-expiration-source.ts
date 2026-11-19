import { AlertSyncScope } from './alert-generator';

export interface LicenseForAlert {
  id: string;
  customerId: string;
  status: 'REGULAR' | 'ATTENTION' | 'EXPIRED' | 'ARCHIVED';
  expirationDate: Date;
}

export abstract class LicenseExpirationSource {
  /** Licenses of non-deleted customers in scope, archived ones included. */
  abstract list(scope: AlertSyncScope): Promise<LicenseForAlert[]>;
}
