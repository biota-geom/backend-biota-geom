import { Injectable } from '@nestjs/common';
import { CreateLicenseData } from './create-license.data';
import { License } from './license.entity';
import { ConditionResponse } from './create-condition-response.entity';
import { ConditionData } from './license-condition.data';
import { LicenseCondition } from './condition.entity';
import { UpdateLicenseConditionData } from './update-license-condition.data';

@Injectable()
export abstract class LicenseRepository {
  abstract create(data: CreateLicenseData): Promise<License>;
  abstract createConditions(data: ConditionData[]): Promise<ConditionResponse>;
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
   * Ordered by expiration date ascending. The panel's criticality order
   * (EXPIRED → ATTENTION → REGULAR) is applied by ListLicensesByCustomerUseCase
   * on the live-derived status, since the stored status can be stale.
   */
  abstract findAllByCustomerId(customerId: string): Promise<License[]>;
}
