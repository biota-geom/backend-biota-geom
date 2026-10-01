import { Injectable } from '@nestjs/common';
import { LicenseStatus } from '@prisma/client';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { calculateLicenseStatus } from '../domain/license-status.calculator';
import { License } from '../domain/license.entity';
import { LicenseRepository } from '../domain/licenses.repository';

export interface LicenseStatusSummary {
  total: number;
  regular: number;
  attention: number;
  expired: number;
}

/*
 * Criticality order for the panel: EXPIRED first, then ATTENTION, then
 * REGULAR. Applied to the status re-derived below (not the stored one), so a
 * license whose persisted status went stale still lands in the right group.
 */
const CRITICALITY_RANK: Record<LicenseStatus, number> = {
  [LicenseStatus.EXPIRED]: 0,
  [LicenseStatus.ATTENTION]: 1,
  [LicenseStatus.REGULAR]: 2,
};

export interface ListLicensesByCustomerResult {
  summary: LicenseStatusSummary;
  licenses: License[];
}

@Injectable()
export class ListLicensesByCustomerUseCase {
  constructor(
    private readonly licenseRepository: LicenseRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(
    customerId: string,
    ownerUserId: string,
  ): Promise<ListLicensesByCustomerResult> {
    // Same indistinguishable-404 rule as the rest of the app: a customer
    // that exists but belongs to another owner must read as not found.
    const customer = await this.customerRepository.findOne(
      customerId,
      ownerUserId,
    );
    if (!customer) {
      throw new CustomerNotFoundError(customerId);
    }

    const storedLicenses =
      await this.licenseRepository.findAllByCustomerId(customerId);
    const now = new Date();

    let regular = 0;
    let attention = 0;
    let expired = 0;

    // Re-derived from expirationDate against the server clock rather than
    // trusting the status persisted at creation time, so a license created
    // long ago still reports its current status on the panel.
    const licenses = storedLicenses.map((license) => {
      const status = calculateLicenseStatus(license.expirationDate, now);

      if (status === LicenseStatus.REGULAR) {
        regular += 1;
      } else if (status === LicenseStatus.ATTENTION) {
        attention += 1;
      } else {
        expired += 1;
      }

      return { ...license, status };
    });

    // Within each criticality group, the soonest expiration comes first.
    licenses.sort(
      (a, b) =>
        CRITICALITY_RANK[a.status] - CRITICALITY_RANK[b.status] ||
        a.expirationDate.getTime() - b.expirationDate.getTime(),
    );

    return {
      // `total` always derives from the sum below — never an independent count.
      summary: {
        total: regular + attention + expired,
        regular,
        attention,
        expired,
      },
      licenses,
    };
  }
}
