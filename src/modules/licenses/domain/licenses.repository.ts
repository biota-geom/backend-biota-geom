import { Injectable } from '@nestjs/common';
import { CreateLicenseData } from './create-license.data';
import { License } from './license.entity';
import { LicenseWithConditionsSummary } from './license-conditions-summary';

@Injectable()
export abstract class LicenseRepository {
  abstract create(data: CreateLicenseData): Promise<License>;
  abstract findById(id: string): Promise<License | null>;
  /*
   * Ordered by expiration date ascending so already-expired licenses (the
   * furthest-past dates) surface first, followed by the ones closest to
   * expiring next — a single ordering that satisfies both "vencidas
   * primeiro" and "por data de validade mais próxima".
   *
   * Each license carries how many conditions it has and how many of those
   * are attended (see ATTENDED_LICENSE_CONDITION_STATUSES).
   */
  abstract findAllByCustomerId(
    customerId: string,
  ): Promise<LicenseWithConditionsSummary[]>;
}
