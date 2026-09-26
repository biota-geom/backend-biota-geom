import { Injectable } from '@nestjs/common';
import { CreateLicenseData } from './create-license.data';
import { License } from './license.entity';
import { ConditionResponse } from './create-condition-response.entity';
import { CreateConditionData } from './license-condition.data';

@Injectable()
export abstract class LicenseRepository {
  abstract create(data: CreateLicenseData): Promise<License>;
  abstract createConditions(
    data: CreateConditionData[],
  ): Promise<ConditionResponse>;
}
