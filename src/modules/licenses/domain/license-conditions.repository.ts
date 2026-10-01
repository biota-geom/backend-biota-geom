import { Injectable } from '@nestjs/common';
import { AddLicenseConditionData } from './add-license-condition.data';
import { LicenseCondition } from './license-condition.entity';

@Injectable()
export abstract class LicenseConditionRepository {
  abstract addMany(
    conditions: AddLicenseConditionData[],
  ): Promise<LicenseCondition[]>;
  abstract findAllByCustomerId(customerId: string): Promise<LicenseCondition[]>;
}
