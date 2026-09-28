// domain/create-condition.data.ts
import {
  ConditionType,
  ConditionPeriodicity,
  ConditionStatus,
} from '@prisma/client';

export interface CreateConditionData {
  licenseId: string;
  itemNumber: string;
  title?: string;
  description: string;
  responsibleName: string;
  conditionType: ConditionType;
  periodicity?: ConditionPeriodicity;
  deadline?: Date;
  dueDate?: Date;
  alertDate?: Date;
  completionDate?: Date;
  status: ConditionStatus;
}
