import { LicenseStatus, LicenseType } from '@prisma/client';
import { IssuingAgency } from '../../issuing-agencies/domain/issuing-agency.entity';

export interface License {
  id: string;
  customerId: string;
  type: LicenseType;
  processNumber: string;
  issuingAgencyId: string;
  issuingAgency?: IssuingAgency;
  issueDate: Date;
  expirationDate: Date;
  status: LicenseStatus;
  documentUrl: string;
  createdAt: Date;
  updatedAt: Date;
}
