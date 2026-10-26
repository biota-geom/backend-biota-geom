import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { EsgIndicatorValues } from '../domain/esg-indicator';
import { EsgIndicatorRecordRepository } from '../domain/esg-indicator-records.repository';
import { parseReferenceMonth } from '../domain/reference-month';

@Injectable()
export class GetEsgIndicatorsUseCase {
  constructor(
    private readonly recordRepository: EsgIndicatorRecordRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(
    customerId: string,
    ownerUserId: string,
    month: string,
  ): Promise<EsgIndicatorValues> {
    const referenceMonth = parseReferenceMonth(month);

    // A customer owned by someone else reads as not found, same as the rest.
    const customer = await this.customerRepository.findOne(
      customerId,
      ownerUserId,
    );
    if (!customer) {
      throw new CustomerNotFoundError(customerId);
    }

    return this.recordRepository.findByMonth(customerId, referenceMonth);
  }
}
