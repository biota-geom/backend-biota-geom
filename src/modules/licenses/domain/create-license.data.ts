import { LicenseStatus, LicenseType } from '@prisma/client';

export interface CreateLicenseData {
  customerId: string;
  type: LicenseType;
  processNumber: string;
  issuingAgencyId: string;
  issueDate: Date;
  expirationDate: Date;
  // Computed by CreateLicenseUseCase from expirationDate — never accepted
  // from the request body.
  status: LicenseStatus;
  documentUrl: string;
}
