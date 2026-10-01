import { Injectable } from '@nestjs/common';
import {
  LicenseConditionStatus,
  LicenseConditionTargetOperator,
} from '@prisma/client';
import { CustomerEsgMetricRepository } from '../../customers/domain/customer-esg-metric.repository';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { EsgMetricRepository } from '../../esg-metrics/domain/repositories/esg-metric.repository';
import { InvalidConditionDueDateError } from '../domain/errors/invalid-condition-due-date.error';
import { InvalidConditionTargetError } from '../domain/errors/invalid-condition-target.error';
import { LicenseConditionLicenseMismatchError } from '../domain/errors/license-condition-license-mismatch.error';
import { LicenseNotFoundError } from '../domain/errors/license-not-found.error';
import { LicenseCondition } from '../domain/license-condition.entity';
import { LicenseConditionRepository } from '../domain/license-conditions.repository';
import { LicenseRepository } from '../domain/licenses.repository';
import { assertConditionCategoriesLinked } from './assert-condition-categories-linked';

export interface LicenseConditionToAdd {
  licenseId: string;
  name: string;
  esgMetricId: string;
  responsibleAgency: string;
  dueDate: Date;
  status?: LicenseConditionStatus;
  description?: string;
  targetMetricId?: string;
  targetOperator?: LicenseConditionTargetOperator;
  targetValue?: number;
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

    input.conditions.forEach((condition) => {
      this.assertValidDueDate(condition);
      this.assertValidTarget(condition);
    });

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
      input.conditions.flatMap((condition) =>
        condition.targetMetricId
          ? [condition.esgMetricId, condition.targetMetricId]
          : [condition.esgMetricId],
      ),
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

  // The due date is mandatory: a missing or unparseable date is rejected.
  private assertValidDueDate(condition: LicenseConditionToAdd): void {
    const dueDate: unknown = condition.dueDate;
    if (!(dueDate instanceof Date) || Number.isNaN(dueDate.getTime())) {
      throw new InvalidConditionDueDateError();
    }
  }

  // The compliance target is all-or-nothing: metric, operator and value.
  private assertValidTarget(condition: LicenseConditionToAdd): void {
    const provided = [
      condition.targetMetricId,
      condition.targetOperator,
      condition.targetValue,
    ].filter((field) => field !== undefined && field !== null);

    if (provided.length !== 0 && provided.length !== 3) {
      throw new InvalidConditionTargetError();
    }
    if (
      condition.targetValue !== undefined &&
      !Number.isFinite(condition.targetValue)
    ) {
      throw new InvalidConditionTargetError();
    }
  }

  private assertCategoriesLinkedToCustomer(
    esgMetricIds: string[],
    customerId: string,
    ownerUserId: string,
  ): Promise<void> {
    return assertConditionCategoriesLinked(
      {
        esgMetricRepository: this.esgMetricRepository,
        customerEsgMetricRepository: this.customerEsgMetricRepository,
      },
      esgMetricIds,
      customerId,
      ownerUserId,
    );
  }
}
