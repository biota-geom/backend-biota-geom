import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { License } from '../domain/license.entity';
import { LicenseRepository } from '../domain/licenses.repository';
import { LicenseNotFoundError } from '../domain/errors/license-not-found.error';
import { LicenseCondition } from '../domain/condition.entity';

@Injectable()
export class GetLicenseDetailsUseCase {
  constructor(
    private readonly licenseRepository: LicenseRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(
    customerId: string,
    licenseId: string,
    ownerUserId: string,
  ): Promise<License & { conditions: LicenseCondition[] }> {
    const customer = await this.customerRepository.findOne(
      customerId,
      ownerUserId,
    );
    if (!customer) throw new CustomerNotFoundError(customerId);

    const license = await this.licenseRepository.findByIdForCustomer(
      licenseId,
      customerId,
    );
    if (!license) throw new LicenseNotFoundError(licenseId);

    return license;
  }
}
