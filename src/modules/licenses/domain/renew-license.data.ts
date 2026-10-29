import { LicenseStatus } from '@prisma/client';

export interface RenewLicenseData {
  previousLicenseId: string;
  customerId: string;
  type: string;
  processNumber: string;
  issuingAgency: string;
  issueDate: Date;
  expirationDate: Date;
  status: LicenseStatus;
  documentUrl: string;
}
