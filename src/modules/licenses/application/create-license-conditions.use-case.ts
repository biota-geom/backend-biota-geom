import { Injectable } from '@nestjs/common';
import { LicenseRepository } from '../domain/licenses.repository';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { LicenseNotFoundError } from '../domain/errors/license-not-found.error';
import { CreateLicenseConditionsDto } from '../presentation/dto/create-license-conditions.dto';
import {
  ConditionType,
  ConditionPeriodicity,
  ConditionStatus,
} from '@prisma/client';
import { ConditionData } from '../domain/license-condition.data';
import { CreateLicenseConditionsResponseDto } from '../presentation/dto/create-license-conditions-response.dto';

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

    const firstCreatedAt = Date.now();
    const conditionsData: ConditionData[] = input.data.conditions.map(
      (condition, index) => {
        const deadline = new Date(condition.deadline);

        return {
          licenseId: input.licenseId,
          environmentalDescriptor: condition.environmental_descriptor,
          name: condition.title ?? condition.description.slice(0, 160),
          description: condition.description,
          responsibleName: condition.responsible_name,
          conditionType: condition.condition_type as ConditionType,
          periodicity:
            (condition.periodicity as ConditionPeriodicity | undefined) ?? null,
          deadline,
          // due_date is the date the risk/compliance rules read (US17/US21).
          dueDate: deadline,
          conditionStatus: ConditionStatus.IN_PROGRESS,
          hasDelivery: condition.has_delivery ?? true,
          // Distinct timestamps preserve the form order used by read-time numbering.
          createdAt: new Date(firstCreatedAt + index),
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
