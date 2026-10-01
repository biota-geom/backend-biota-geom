import { Injectable } from '@nestjs/common';
import { LicenseRepository } from '../domain/licenses.repository';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { CustomerEsgMetricRepository } from '../../customers/domain/customer-esg-metric.repository';
import { EsgMetricRepository } from '../../esg-metrics/domain/repositories/esg-metric.repository';
import { LicenseNotFoundError } from '../domain/errors/license-not-found.error';
import { CreateLicenseConditionsDto } from '../presentation/dto/create-license-conditions.dto';
import {
  ConditionType,
  ConditionPeriodicity,
  ConditionStatus,
} from '@prisma/client';
import { ConditionData } from '../domain/license-condition.data';
import { CreateLicenseConditionsResponseDto } from '../presentation/dto/create-license-conditions-response.dto';
import { assertConditionCategoriesLinked } from './assert-condition-categories-linked';

interface CreateLicenseConditionInput {
  customerId: string;
  licenseId: string;
  userId: string;
  data: CreateLicenseConditionsDto;
}

@Injectable()
export class CreateLicenseConditionUseCase {
  constructor(
    private readonly repository: LicenseRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly esgMetricRepository: EsgMetricRepository,
    private readonly customerEsgMetricRepository: CustomerEsgMetricRepository,
  ) {}

  async execute(
    input: CreateLicenseConditionInput,
  ): Promise<CreateLicenseConditionsResponseDto> {
    const customer = await this.customerRepository.findOne(
      input.customerId,
      input.userId,
    );
    if (!customer) {
      throw new CustomerNotFoundError(input.customerId);
    }

    // The license must belong to the customer in the URL; one owned by another
    // customer is indistinguishable from an unknown license.
    const license = await this.repository.findById(input.licenseId);
    if (!license || license.customerId !== input.customerId) {
      throw new LicenseNotFoundError(input.licenseId);
    }

    await assertConditionCategoriesLinked(
      {
        esgMetricRepository: this.esgMetricRepository,
        customerEsgMetricRepository: this.customerEsgMetricRepository,
      },
      input.data.conditions.map((condition) => condition.esg_metric_id),
      input.customerId,
      input.userId,
    );

    const conditionsData: ConditionData[] = input.data.conditions.map(
      (condition) => {
        const deadline = new Date(condition.deadline);

        return {
          licenseId: input.licenseId,
          esgMetricId: condition.esg_metric_id,
          itemNumber: condition.item_number,
          name: condition.title ?? `Item ${condition.item_number}`,
          description: condition.description,
          responsibleName: condition.responsible_name,
          conditionType: condition.condition_type as ConditionType,
          periodicity:
            (condition.periodicity as ConditionPeriodicity | undefined) ?? null,
          deadline,
          // due_date is the date the risk/compliance rules read (US17/US21).
          dueDate: deadline,
          conditionStatus: ConditionStatus.IN_PROGRESS,
        };
      },
    );

    const count = await this.repository.createConditions(conditionsData);

    return {
      count: count ? count.count : 0,
      message: 'Condicionantes vinculadas com sucesso',
    };
  }
}
