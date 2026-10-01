import {
  ConditionType,
  ConditionPeriodicity,
  ConditionStatus,
} from '@prisma/client';

export interface ConditionData {
  licenseId: string;
  // GRI parameter (EsgMetric) linked to the license's customer.
  esgMetricId: string;
  itemNumber: string;
  name: string;
  description: string;
  responsibleName: string;
  conditionType: ConditionType;
  periodicity?: ConditionPeriodicity | null;
  deadline?: Date | null;
  dueDate: Date;
  alertDate?: Date;
  completionDate?: Date;
  conditionStatus: ConditionStatus;
}
