import { Injectable } from '@nestjs/common';
import { LicenseConditionStatus } from '@prisma/client';
import { CustomerEsgMetricRepository } from '../../customers/domain/customer-esg-metric.repository';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { EsgMetricRepository } from '../../esg-metrics/domain/repositories/esg-metric.repository';
import { ConditionCategoryNotFoundError } from '../domain/errors/condition-category-not-found.error';
import { ConditionCategoryNotLinkedError } from '../domain/errors/condition-category-not-linked.error';
import { LicenseConditionLicenseMismatchError } from '../domain/errors/license-condition-license-mismatch.error';
import { LicenseNotFoundError } from '../domain/errors/license-not-found.error';
import { LicenseCondition } from '../domain/license-condition.entity';
import { LicenseConditionRepository } from '../domain/license-conditions.repository';
import { LicenseRepository } from '../domain/licenses.repository';

export interface LicenseConditionToAdd {
  licenseId: string;
  name: string;
  esgMetricId: string;
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
    private readonly esgMetricRepository: EsgMetricRepository,
    private readonly customerEsgMetricRepository: CustomerEsgMetricRepository,
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

    await this.assertCategoriesLinkedToCustomer(
      input.conditions.map((condition) => condition.esgMetricId),
      license.customerId,
      input.ownerUserId,
    );

    return this.licenseConditionRepository.addMany(
      input.conditions.map((condition) => ({
        ...condition,
        status: condition.status ?? LicenseConditionStatus.REGULAR,
      })),
    );
  }

  /*
   * A condition's category must be one of the GRI parameters linked to the
   * license's customer (US02). A parameter that does not exist and a custom
   * parameter owned by another account are indistinguishable (not found), so
   * other tenants' private parameters are never revealed; a visible parameter
   * that is simply not linked to this customer is a distinct, reportable case.
   */
  private async assertCategoriesLinkedToCustomer(
    esgMetricIds: string[],
    customerId: string,
    ownerUserId: string,
  ): Promise<void> {
    const uniqueIds = [...new Set(esgMetricIds)];

    const metrics = await this.esgMetricRepository.findByIds(uniqueIds);
    const visibleIds = new Set(
      metrics
        .filter(
          (metric) =>
            metric.customerId === null || metric.customerId === ownerUserId,
        )
        .map((metric) => metric.id),
    );
    const notFoundId = uniqueIds.find((id) => !visibleIds.has(id));
    if (notFoundId !== undefined) {
      throw new ConditionCategoryNotFoundError(notFoundId);
    }

    const linkedIds = new Set(
      await this.customerEsgMetricRepository.findLinkedMetricIds(
        customerId,
        uniqueIds,
      ),
    );
    const notLinkedId = uniqueIds.find((id) => !linkedIds.has(id));
    if (notLinkedId !== undefined) {
      throw new ConditionCategoryNotLinkedError(notLinkedId);
    }
  }
}
