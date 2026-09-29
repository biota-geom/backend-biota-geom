// domain/create-condition.data.ts
import {
  ConditionType,
  ConditionPeriodicity,
  ConditionStatus,
} from '@prisma/client';

export interface ConditionData {
  licenseId: string;
  categoryId?: string | null;
  itemNumber: string;
  title?: string;
  description: string;
  responsibleName: string;
  conditionType: ConditionType;
  periodicity?: ConditionPeriodicity | null;
  deadline?: Date | null;
  dueDate?: Date;
  alertDate?: Date;
  completionDate?: Date;
  status: ConditionStatus;
}
