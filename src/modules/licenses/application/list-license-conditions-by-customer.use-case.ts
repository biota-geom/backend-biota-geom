import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { LicenseCondition } from '../domain/license-condition.entity';
import { calculateLicenseConditionRiskLevel } from '../domain/license-condition-risk.calculator';
import { LicenseConditionRiskLevel } from '../domain/license-condition-risk-level';
import { LicenseConditionRepository } from '../domain/license-conditions.repository';

export interface LicenseConditionWithRisk extends LicenseCondition {
  riskLevel: LicenseConditionRiskLevel;
}

const RISK_ORDER: Record<LicenseConditionRiskLevel, number> = {
  [LicenseConditionRiskLevel.RISK]: 0,
  [LicenseConditionRiskLevel.ATTENTION]: 1,
  [LicenseConditionRiskLevel.REGULAR]: 2,
};

@Injectable()
export class ListLicenseConditionsByCustomerUseCase {
  constructor(
    private readonly licenseConditionRepository: LicenseConditionRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(
    customerId: string,
    ownerUserId: string,
  ): Promise<LicenseConditionWithRisk[]> {
    const customer = await this.customerRepository.findOne(
      customerId,
      ownerUserId,
    );
    if (!customer) {
      throw new CustomerNotFoundError(customerId);
    }

    const now = new Date();
    const conditions =
      await this.licenseConditionRepository.findAllByCustomerId(customerId);

    return conditions
      .map((condition) => ({
        ...condition,
        riskLevel: condition.dueDate
          ? calculateLicenseConditionRiskLevel(condition.dueDate, now)
          : LicenseConditionRiskLevel.REGULAR,
      }))
      .sort((left, right) => {
        const riskDifference =
          RISK_ORDER[left.riskLevel] - RISK_ORDER[right.riskLevel];

        if (riskDifference !== 0) {
          return riskDifference;
        }

        return (
          (left.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER) -
          (right.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER)
        );
      });
  }
}
