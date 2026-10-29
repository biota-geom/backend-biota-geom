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
  title: string;
  environmentalDescriptor: string;
  description: string | null;
  responsibleName: string | null;
  conditionType: ConditionType | null;
  periodicity: ConditionPeriodicity | null;
  deadline: Date | null;
  dueDate: Date | null;
  alertDate: Date | null;
  completionDate: Date | null;
  status: ConditionStatus;
  hasDelivery: boolean;
  isViolated: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}
