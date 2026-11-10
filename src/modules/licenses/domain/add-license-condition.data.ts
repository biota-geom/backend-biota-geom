import { LicenseConditionStatus } from '@prisma/client';

export interface AddLicenseConditionData {
  licenseId: string;
  parentConditionId?: string | null;
  name: string;
  environmentalDescriptor: string;
  responsibleAgency: string;
  dueDate: Date;
  status: LicenseConditionStatus;
  hasDelivery: boolean;
  description?: string;
}
