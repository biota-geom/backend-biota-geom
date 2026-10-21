import { Injectable } from '@nestjs/common';
import { LicenseStatus } from '@prisma/client';
import { LicenseRepository } from '../../licenses/domain/licenses.repository';
import { calculateLicenseStatus } from '../../licenses/domain/license-status.calculator';
import { STATUS_LABELS } from '../../licenses/presentation/dto/license-labels';
import { CustomerNotFoundError } from '../domain/errors/customer-not-found.error';
import { CustomerRepository } from '../domain/customers.repository';
import { CustomerLicenseDetailsResponseDto } from '../presentation/dto/customer-license-details.dto';

function criticalityRank(status: LicenseStatus): number {
  switch (status) {
    case LicenseStatus.EXPIRED:
      return 0;
    case LicenseStatus.ATTENTION:
      return 1;
    case LicenseStatus.REGULAR:
      return 2;
    default:
      return 3;
  }
}

@Injectable()
export class ListCustomerDashboardLicensesUseCase {
  constructor(
    private readonly licensesRepository: LicenseRepository,
    private readonly customersRepository: CustomerRepository,
  ) {}

  async execute(
    customerId: string,
    userId: string,
  ): Promise<CustomerLicenseDetailsResponseDto> {
    const customer = await this.customersRepository.findOne(customerId, userId);
    if (!customer) {
      throw new CustomerNotFoundError(customerId);
    }

    const customerLicenses =
      await this.licensesRepository.findCustomerLicenses(customerId);
    const now = new Date();
    const licensesWithStatus = customerLicenses.map((license) => ({
      license,
      status: calculateLicenseStatus(license.expirationDate, now),
    }));
    const criticalLicenses = licensesWithStatus
      .filter(
        ({ status }) =>
          status === LicenseStatus.EXPIRED ||
          status === LicenseStatus.ATTENTION,
      )
      .sort(
        (a, b) =>
          criticalityRank(a.status) - criticalityRank(b.status) ||
          a.license.expirationDate.getTime() -
            b.license.expirationDate.getTime(),
      )
      .slice(0, 3);

    const licensesDetails: CustomerLicenseDetailsResponseDto = {
      header: {
        active_licenses: customerLicenses.length,
        pending_items: licensesWithStatus.filter(
          ({ status }) =>
            status === LicenseStatus.EXPIRED ||
            status === LicenseStatus.ATTENTION,
        ).length,
      },
      counts: {
        regular: licensesWithStatus.filter(
          ({ status }) => status === LicenseStatus.REGULAR,
        ).length,
        pending: licensesWithStatus.filter(
          ({ status }) => status === LicenseStatus.ATTENTION,
        ).length,
        expired: licensesWithStatus.filter(
          ({ status }) => status === LicenseStatus.EXPIRED,
        ).length,
      },
      critical: criticalLicenses.map(({ license, status }) => ({
        id: license.id,
        type: license.type,
        process_number: license.processNumber,
        expiration_date: license.expirationDate.toISOString().slice(0, 10),
        status: STATUS_LABELS[status],
      })),
    };

    return licensesDetails;
  }
}
