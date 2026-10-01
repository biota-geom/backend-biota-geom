import {
  LicenseConditionStatus,
  LicenseConditionTargetOperator,
} from '@prisma/client';

export interface AddLicenseConditionData {
  licenseId: string;
  name: string;
  esgMetricId: string;
  responsibleAgency: string;
  dueDate: Date;
  status: LicenseConditionStatus;
  description?: string;
  targetMetricId?: string;
  targetOperator?: LicenseConditionTargetOperator;
  targetValue?: number;
}
