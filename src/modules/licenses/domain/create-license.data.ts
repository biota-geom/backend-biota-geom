import { LicenseStatus } from '@prisma/client';

export interface CreateLicenseData {
  customerId: string;
  type: string;
  processNumber: string;
  issuingAgency: string;
  issueDate: Date;
  expirationDate: Date;
  // Computed by CreateLicenseUseCase from expirationDate — never accepted
  // from the request body.
  status: LicenseStatus;
  documentUrl: string;
}
