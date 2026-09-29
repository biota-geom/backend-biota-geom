import { Injectable } from '@nestjs/common';
import { LicenseStatus } from '@prisma/client';
import { calculateLicenseStatus } from '../../licenses/domain/license-status.calculator';
import { calculateConformityPercentage } from '../domain/conformity-percentage';
import { CustomerRepository } from '../domain/customers.repository';
import { CustomerListResponseDTO } from '../presentation/dto/customer-list-response.dto';

@Injectable()
export class ListCustomersUseCase {
  constructor(private readonly repository: CustomerRepository) {}

  // Only the authenticated owner's portfolio (US03) — the repository scopes
  // the query, so there is no unfiltered list to fall back to.
  async listCustomers(
    ownerUserId: string,
    now: Date = new Date(),
  ): Promise<CustomerListResponseDTO[]> {
    const customers = await this.repository.findAll(ownerUserId);

    return customers.map((customer) => {
      const city = customer.address?.city ?? '';
      const state = customer.address?.state ?? '';
      const location = [city, state].filter(Boolean).join(' - ');
      const regularLicenses = customer.licenseExpirationDates.filter(
        (expirationDate) =>
          calculateLicenseStatus(expirationDate, now) === LicenseStatus.REGULAR,
      ).length;

      return {
        id: customer.id,
        name: customer.name,
        document: customer.document,
        status: customer.isActive ? 'Ativo' : 'Inativo',
        segment: customer.sector?.name ?? '',
        location,
        total_licenses: customer.totalLicenses,
        updated_at: customer.updatedAt.toISOString(),
        conformity_percentage: calculateConformityPercentage(
          regularLicenses,
          customer.totalLicenses,
        ),
      };
    });
  }
}
