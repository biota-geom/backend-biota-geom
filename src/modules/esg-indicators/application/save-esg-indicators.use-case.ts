import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import {
  EsgIndicatorChanges,
  EsgIndicatorValues,
} from '../domain/esg-indicator';
import { EsgIndicatorRecordRepository } from '../domain/esg-indicator-records.repository';
import { parseReferenceMonth } from '../domain/reference-month';

export interface SaveEsgIndicatorsInput {
  customerId: string;
  ownerUserId: string;
  month: string;
  changes: EsgIndicatorChanges;
}

@Injectable()
export class SaveEsgIndicatorsUseCase {
  constructor(
    private readonly recordRepository: EsgIndicatorRecordRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(input: SaveEsgIndicatorsInput): Promise<EsgIndicatorValues> {
    const referenceMonth = parseReferenceMonth(input.month);

    const customer = await this.customerRepository.findOne(
      input.customerId,
      input.ownerUserId,
    );
    if (!customer) {
      throw new CustomerNotFoundError(input.customerId);
    }

    return this.recordRepository.saveMonth(
      input.customerId,
      referenceMonth,
      input.changes,
    );
  }
}
