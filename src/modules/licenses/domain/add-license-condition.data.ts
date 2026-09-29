import { LicenseConditionStatus } from '@prisma/client';

export interface AddLicenseConditionData {
  licenseId: string;
  name: string;
  category: string;
  responsibleAgency: string;
  dueDate: Date;
  status: LicenseConditionStatus;
  description?: string;
}
