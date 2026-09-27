import { Injectable } from '@nestjs/common';
import { LicenseCondition } from './license-condition.entity';

@Injectable()
export abstract class LicenseConditionRepository {
  abstract findAllByCustomerId(customerId: string): Promise<LicenseCondition[]>;
}
