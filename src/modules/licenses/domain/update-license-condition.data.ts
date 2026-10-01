import {
  ConditionType,
  ConditionPeriodicity,
  ConditionStatus,
} from '@prisma/client';

export interface UpdateLicenseCondition {
  itemNumber?: string;
  title?: string;
  description?: string;
  responsibleName?: string;
  conditionType?: ConditionType;
  periodicity?: ConditionPeriodicity | null;
  deadline?: Date | null;
  dueDate?: Date;
  alertDate?: Date | null;
  completionDate?: Date | null;
  status?: ConditionStatus;
  isViolated?: boolean;
}

export interface UpdateLicenseConditionData {
  id: string;
  licenseId: string;
  customerId: string;
  data: UpdateLicenseCondition;
}
