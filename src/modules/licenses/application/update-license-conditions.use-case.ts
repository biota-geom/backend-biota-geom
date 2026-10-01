import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { LicenseRepository } from '../domain/licenses.repository';
import { UpdateLicenseCondition } from '../domain/update-license-condition.data';
import { LicenseCondition } from '../domain/condition.entity';

export interface UpdateLicenseConditionInput {
  customerId: string;
  licenseId: string;
  conditionId: string;
  ownerUserId: string;
  data: UpdateLicenseCondition;
}

@Injectable()
export class UpdateLicenseConditionUseCase {
  constructor(
    private readonly repository: LicenseRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(input: UpdateLicenseConditionInput): Promise<LicenseCondition> {
    const customer = await this.customerRepository.findOne(
      input.customerId,
      input.ownerUserId,
    );

    if (!customer) throw new CustomerNotFoundError(input.customerId);

    return this.repository.updateCondition({
      id: input.conditionId,
      licenseId: input.licenseId,
      customerId: input.customerId,
      data: input.data,
    });
  }
}
