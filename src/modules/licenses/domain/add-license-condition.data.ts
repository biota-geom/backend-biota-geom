import { LicenseConditionStatus } from '@prisma/client';

export interface AddLicenseConditionData {
  licenseId: string;
  name: string;
  esgMetricId: string;
  responsibleAgency: string;
  dueDate: Date;
  status: LicenseConditionStatus;
  description?: string;
}
