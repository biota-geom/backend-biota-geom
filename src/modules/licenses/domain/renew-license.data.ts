import { LicenseStatus, LicenseType } from '@prisma/client';

export interface RenewalConditionDecision {
  conditionId: string;
  fulfilled: boolean;
  copyToNew: boolean;
  newDueDate?: Date;
}

export interface RenewLicenseData {
  previousLicenseId: string;
  customerId: string;
  type: LicenseType;
  processNumber: string;
  issuingAgencyId: string;
  issueDate: Date;
  expirationDate: Date;
  status: LicenseStatus;
  documentUrl: string;
  conditions: RenewalConditionDecision[];
}
