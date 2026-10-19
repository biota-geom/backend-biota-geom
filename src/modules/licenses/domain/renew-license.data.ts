import { LicenseStatus, LicenseType } from '@prisma/client';

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
}
