import { Injectable } from '@nestjs/common';
import { LicenseCondition } from './license-condition.entity';
import { UpdateLicenseConditionData } from './update-license-condition.data';

/*
 * Multi-tenant boundary, same rule as CustomerRepository: the owning customer
 * is a required argument of every single-row method, not an optional filter,
 * so the scope lives in the query and a condition owned by another company
 * cannot be read, written or deleted here — it simply does not match.
 *
 * Consequence, on purpose: a foreign condition reads as "not found"
 * (null / false), never as "forbidden".
 */
@Injectable()
export abstract class LicenseConditionRepository {
  abstract findAllByCustomerId(customerId: string): Promise<LicenseCondition[]>;
  abstract update(
    conditionId: string,
    customerId: string,
    data: UpdateLicenseConditionData,
  ): Promise<LicenseCondition | null>;
  abstract remove(conditionId: string, customerId: string): Promise<boolean>;
}
