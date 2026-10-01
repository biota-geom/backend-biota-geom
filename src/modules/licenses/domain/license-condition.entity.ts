import {
  LicenseConditionStatus,
  LicenseConditionTargetOperator,
} from '@prisma/client';

// The GRI parameter (EsgMetric) the condition is categorized under.
export interface LicenseConditionCategory {
  id: string;
  name: string;
}

export interface LicenseCondition {
  id: string;
  licenseId: string;
  name: string;
  description: string | null;
  category: LicenseConditionCategory;
  responsibleAgency: string | null;
  dueDate: Date;
  status: LicenseConditionStatus;
  targetMetricId: string | null;
  targetOperator: LicenseConditionTargetOperator | null;
  targetValue: number | null;
  createdAt: Date;
  updatedAt: Date;
}
