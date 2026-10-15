import { LicenseStatus } from '@prisma/client';

export interface License {
  id: string;
  customerId: string;
  type: string;
  processNumber: string;
  issuingAgency: string;
  issueDate: Date;
  expirationDate: Date;
  status: LicenseStatus;
  documentUrl: string;
  previousLicenseId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
