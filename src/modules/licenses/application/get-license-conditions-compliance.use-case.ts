import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import {
  calculateLicenseConditionsCompliance,
  LicenseConditionsCompliance,
} from '../domain/license-conditions-compliance.calculator';
import { LicenseConditionRepository } from '../domain/license-conditions.repository';

@Injectable()
export class GetLicenseConditionsComplianceUseCase {
  constructor(
    private readonly licenseConditionRepository: LicenseConditionRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(
    customerId: string,
    ownerUserId: string,
    now: Date = new Date(),
  ): Promise<LicenseConditionsCompliance> {
    const customer = await this.customerRepository.findOne(
      customerId,
      ownerUserId,
    );
    if (!customer) {
      throw new CustomerNotFoundError(customerId);
    }

    const conditions =
      await this.licenseConditionRepository.findAllByCustomerId(customerId);

    return calculateLicenseConditionsCompliance(
      conditions.map((condition) => condition.dueDate),
      now,
    );
  }
}
