import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { LicenseConditionNotFoundError } from '../domain/errors/license-condition-not-found.error';
import { LicenseConditionRepository } from '../domain/license-conditions.repository';

@Injectable()
export class DeleteLicenseConditionUseCase {
  constructor(
    private readonly licenseConditionRepository: LicenseConditionRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(
    conditionId: string,
    customerId: string,
    ownerUserId: string,
  ): Promise<void> {
    const customer = await this.customerRepository.findOne(
      customerId,
      ownerUserId,
    );
    if (!customer) {
      throw new CustomerNotFoundError(customerId);
    }

    const removed = await this.licenseConditionRepository.remove(
      conditionId,
      customerId,
    );
    if (!removed) {
      throw new LicenseConditionNotFoundError(conditionId);
    }
  }
}
