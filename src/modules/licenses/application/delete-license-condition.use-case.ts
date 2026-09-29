import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { LicenseRepository } from '../domain/licenses.repository';

@Injectable()
export class DeleteLicenseConditionUseCase {
  constructor(
    private readonly licenseRepository: LicenseRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(
    customerId: string,
    licenseId: string,
    conditionId: string,
    ownerUserId: string,
  ): Promise<void> {
    const customer = await this.customerRepository.findOne(
      customerId,
      ownerUserId,
    );
    if (!customer) throw new CustomerNotFoundError(customerId);

    await this.licenseRepository.deleteCondition(
      conditionId,
      licenseId,
      customerId,
    );
  }
}
