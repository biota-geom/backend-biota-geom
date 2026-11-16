import { ConditionStatus, LicenseConditionStatus } from '@prisma/client';

export interface LicenseCondition {
  id: string;
  licenseId: string;
  name: string;
  description: string | null;
  environmentalDescriptor: string;
  responsibleAgency: string | null;
  dueDate: Date;
  status: LicenseConditionStatus;
  conditionStatus?: ConditionStatus;
  completionDate?: Date | null;
  hasDelivery: boolean;
  isViolated: boolean;
  createdAt: Date;
  updatedAt: Date;
}
