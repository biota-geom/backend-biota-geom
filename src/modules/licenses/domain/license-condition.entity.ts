import { LicenseConditionStatus } from '@prisma/client';

export interface LicenseCondition {
  id: string;
  licenseId: string;
  name: string | null;
  description: string | null;
  category: string | null;
  responsibleAgency: string | null;
  dueDate: Date | null;
  status: LicenseConditionStatus;
  createdAt: Date;
  updatedAt: Date;
}
