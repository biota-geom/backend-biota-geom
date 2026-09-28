import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { LicenseConditionNotFoundError } from '../domain/errors/license-condition-not-found.error';
import { LicenseNotFoundError } from '../domain/errors/license-not-found.error';
import { calculateLicenseConditionRiskLevel } from '../domain/license-condition-risk.calculator';
import { LicenseConditionRepository } from '../domain/license-conditions.repository';
import { LicenseRepository } from '../domain/licenses.repository';
import { UpdateLicenseConditionData } from '../domain/update-license-condition.data';
import { LicenseConditionWithRisk } from './list-license-conditions-by-customer.use-case';

@Injectable()
export class UpdateLicenseConditionUseCase {
  constructor(
    private readonly licenseConditionRepository: LicenseConditionRepository,
    private readonly licenseRepository: LicenseRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(
    conditionId: string,
    customerId: string,
    ownerUserId: string,
    data: UpdateLicenseConditionData,
  ): Promise<LicenseConditionWithRisk> {
    const customer = await this.customerRepository.findOne(
      customerId,
      ownerUserId,
    );
    if (!customer) {
      throw new CustomerNotFoundError(customerId);
    }

    /*
     * The condition may be moved to a different license, so the target has to
     * be checked against the same customer — otherwise an edit could park a
     * condition under another company's license.
     */
    const license = await this.licenseRepository.findByIdForCustomer(
      data.licenseId,
      customerId,
    );
    if (!license) {
      throw new LicenseNotFoundError(data.licenseId);
    }

    const condition = await this.licenseConditionRepository.update(
      conditionId,
      customerId,
      data,
    );
    if (!condition) {
      throw new LicenseConditionNotFoundError(conditionId);
    }

    /*
     * Recomputed here, not read back from storage, for the same reason the
     * listing computes it: the risk level is a function of the due date and
     * the current date, so a due date the caller just moved has to answer
     * with the level that new date implies.
     */
    return {
      ...condition,
      riskLevel: calculateLicenseConditionRiskLevel(
        condition.dueDate,
        new Date(),
      ),
    };
  }
}
