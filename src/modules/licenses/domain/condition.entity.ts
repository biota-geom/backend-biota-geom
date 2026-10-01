import {
  ConditionType,
  ConditionPeriodicity,
  ConditionStatus,
} from '@prisma/client';
import { License } from './license.entity';

export interface LicenseCondition {
  id: string;
  licenseId: string;
  license?: License;
  itemNumber: string;
  title: string | null;
  description: string;
  responsibleName: string;
  conditionType: ConditionType;
  periodicity: ConditionPeriodicity | null;
  deadline: Date | null;
  dueDate: Date | null;
  alertDate: Date | null;
  completionDate: Date | null;
  status: ConditionStatus;
  createdAt: Date;
  updatedAt: Date;
}
