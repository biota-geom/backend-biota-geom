import { Injectable } from '@nestjs/common';
import { LicenseConditionRiskLevel } from '../../licenses/domain/license-condition-risk-level';
import {
  LicenseConditionWithRisk,
  ListLicenseConditionsByCustomerUseCase,
} from '../../licenses/application/list-license-conditions-by-customer.use-case';
import { GetLicenseConditionsComplianceUseCase } from '../../licenses/application/get-license-conditions-compliance.use-case';

export interface CustomerDashboardConditions {
  totalActive: number;
  inCompliance: number;
  compliancePercentage: number;
  critical: LicenseConditionWithRisk[];
}

@Injectable()
export class GetCustomerDashboardConditionsUseCase {
  constructor(
    private readonly listLicenseConditionsByCustomerUseCase: ListLicenseConditionsByCustomerUseCase,
    private readonly getLicenseConditionsComplianceUseCase: GetLicenseConditionsComplianceUseCase,
  ) {}

  async execute(
    customerId: string,
    ownerUserId: string,
  ): Promise<CustomerDashboardConditions> {
    const now = new Date();
    const [{ data: conditions }, compliance] = await Promise.all([
      this.listLicenseConditionsByCustomerUseCase.execute(
        customerId,
        ownerUserId,
        undefined,
        now,
      ),
      this.getLicenseConditionsComplianceUseCase.execute(
        customerId,
        ownerUserId,
        now,
      ),
    ]);

    return {
      ...compliance,
      critical: conditions
        .filter(
          (condition) =>
            condition.riskLevel !== LicenseConditionRiskLevel.REGULAR,
        )
        .slice(0, 3),
    };
  }
}
