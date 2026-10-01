import { Injectable } from '@nestjs/common';
import { CreateLicenseData } from './create-license.data';
import { License } from './license.entity';

@Injectable()
export abstract class LicenseRepository {
  abstract create(data: CreateLicenseData): Promise<License>;
  /*
   * Ordered by expiration date ascending. The panel's criticality order
   * (EXPIRED → ATTENTION → REGULAR) is applied by ListLicensesByCustomerUseCase
   * on the live-derived status, since the stored status can be stale.
   */
  abstract findAllByCustomerId(customerId: string): Promise<License[]>;
}
