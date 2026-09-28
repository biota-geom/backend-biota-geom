import { Injectable } from '@nestjs/common';
import { CreateLicenseData } from './create-license.data';
import { License } from './license.entity';

@Injectable()
export abstract class LicenseRepository {
  abstract create(data: CreateLicenseData): Promise<License>;
  /*
   * Ordered by expiration date ascending so already-expired licenses (the
   * furthest-past dates) surface first, followed by the ones closest to
   * expiring next — a single ordering that satisfies both "vencidas
   * primeiro" and "por data de validade mais próxima".
   */
  abstract findAllByCustomerId(customerId: string): Promise<License[]>;
  /*
   * Scoped by customer for the same reason as CustomerRepository: a license
   * belonging to another company must read as "not found", never as
   * "forbidden". Used to check that a condition is being linked to a license
   * the caller actually owns.
   */
  abstract findByIdForCustomer(
    licenseId: string,
    customerId: string,
  ): Promise<License | null>;
}
