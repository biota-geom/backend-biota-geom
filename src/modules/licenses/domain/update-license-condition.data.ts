import {
  ConditionType,
  ConditionPeriodicity,
  ConditionStatus,
} from '@prisma/client';

export interface UpdateLicenseCondition {
  title?: string;
  environmentalDescriptor?: string;
  description?: string;
  responsibleAgency?: string;
  responsibleName?: string;
  conditionType?: ConditionType;
  periodicity?: ConditionPeriodicity | null;
  deadline?: Date | null;
  dueDate?: Date;
  alertDate?: Date | null;
  completionDate?: Date | null;
  status?: ConditionStatus;
  hasDelivery?: boolean;
  isViolated?: boolean;
}

export interface UpdateLicenseConditionData {
  id: string;
  licenseId: string;
  customerId: string;
  data: UpdateLicenseCondition;
}
