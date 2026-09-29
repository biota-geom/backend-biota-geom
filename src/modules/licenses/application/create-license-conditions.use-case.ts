import { Injectable } from '@nestjs/common';
import { LicenseRepository } from '../domain/licenses.repository';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
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

    const conditionsData: ConditionData[] = input.data.conditions.map(
      (condition) => ({
        licenseId: input.licenseId,
        categoryId: condition.category_id,
        itemNumber: condition.item_number,
        description: condition.description,
        responsibleName: condition.responsible_name,
        conditionType: condition.condition_type as ConditionType,
        periodicity: condition.periodicity as ConditionPeriodicity,
        deadline: new Date(condition.deadline),
        status: ConditionStatus.IN_PROGRESS,
      }),
    );

    const count = await this.repository.createConditions(conditionsData);

    return {
      count: count ? count.count : 0,
      message: 'Condicionantes vinculadas com sucesso',
    };
  }
}
