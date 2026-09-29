import { Injectable } from '@nestjs/common';
import { LicenseConditionStatus } from '@prisma/client';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { LicenseConditionLicenseMismatchError } from '../domain/errors/license-condition-license-mismatch.error';
import { LicenseNotFoundError } from '../domain/errors/license-not-found.error';
import { LicenseCondition } from '../domain/license-condition.entity';
import { LicenseConditionRepository } from '../domain/license-conditions.repository';
import { LicenseRepository } from '../domain/licenses.repository';

export interface LicenseConditionToAdd {
  licenseId: string;
  name: string;
  category: string;
  responsibleAgency: string;
  dueDate: Date;
  status?: LicenseConditionStatus;
  description?: string;
}

export interface AddLicenseConditionsInput {
  licenseId: string;
  ownerUserId: string;
  conditions: LicenseConditionToAdd[];
}

@Injectable()
export class AddLicenseConditionsUseCase {
  constructor(
    private readonly licenseConditionRepository: LicenseConditionRepository,
    private readonly licenseRepository: LicenseRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(input: AddLicenseConditionsInput): Promise<LicenseCondition[]> {
    if (
      input.conditions.some(
        (condition) => condition.licenseId !== input.licenseId,
      )
    ) {
      throw new LicenseConditionLicenseMismatchError();
    }

    const license = await this.licenseRepository.findById(input.licenseId);
    if (!license) {
      throw new LicenseNotFoundError(input.licenseId);
    }

    const customer = await this.customerRepository.findOne(
      license.customerId,
      input.ownerUserId,
    );
    if (!customer) {
      // An existing license owned by another account must be indistinguishable
      // from an unknown license to avoid leaking cross-customer identifiers.
      throw new LicenseNotFoundError(input.licenseId);
    }

    return this.licenseConditionRepository.addMany(
      input.conditions.map((condition) => ({
        ...condition,
        status: condition.status ?? LicenseConditionStatus.REGULAR,
      })),
    );
  }
}
