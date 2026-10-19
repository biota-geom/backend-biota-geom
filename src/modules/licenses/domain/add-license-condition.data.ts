import { LicenseConditionStatus } from '@prisma/client';

export interface AddLicenseConditionData {
  licenseId: string;
  name: string;
  environmentalDescriptor: string;
  responsibleAgency: string;
  dueDate: Date;
  status: LicenseConditionStatus;
  hasDelivery: boolean;
  description?: string;
}
