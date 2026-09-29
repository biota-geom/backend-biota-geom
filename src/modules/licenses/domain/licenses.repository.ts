import { Injectable } from '@nestjs/common';
import { CreateLicenseData } from './create-license.data';
import { License } from './license.entity';
import { ConditionResponse } from './create-condition-response.entity';
import { ConditionData } from './license-condition.data';
import { LicenseCondition } from './condition.entity';
import { UpdateLicenseConditionData } from './update-license-condition.data';
import { LicenseConditionCategory } from './license-condition-category.entity';

@Injectable()
export abstract class LicenseRepository {
  abstract create(data: CreateLicenseData): Promise<License>;
  abstract createConditions(data: ConditionData[]): Promise<ConditionResponse>;
  abstract createConditionCategory(
    name: string,
  ): Promise<LicenseConditionCategory>;
  abstract findByIdForCustomer(
    id: string,
    customerId: string,
  ): Promise<(License & { conditions: LicenseCondition[] }) | null>;
  abstract updateCondition(
    data: UpdateLicenseConditionData,
  ): Promise<LicenseCondition>;
  abstract deleteCondition(
    id: string,
    licenseId: string,
    customerId: string,
  ): Promise<LicenseCondition>;
  abstract findById(id: string): Promise<License | null>;
  /*
   * Ordered by expiration date ascending so already-expired licenses (the
   * furthest-past dates) surface first, followed by the ones closest to
   * expiring next — a single ordering that satisfies both "vencidas
   * primeiro" and "por data de validade mais próxima".
   */
  abstract findAllByCustomerId(customerId: string): Promise<License[]>;
}
