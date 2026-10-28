import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { CustomerIndicatorRepository } from '../domain/customer-indicators.repository';
import { MonthlyIndicator, toMonthlyIndicators } from '../domain/esg-indicator';
import { EsgIndicatorRecordRepository } from '../domain/esg-indicator-records.repository';
import { parseReferenceMonth } from '../domain/reference-month';

@Injectable()
export class GetEsgIndicatorsUseCase {
  constructor(
    private readonly recordRepository: EsgIndicatorRecordRepository,
    private readonly customerIndicatorRepository: CustomerIndicatorRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(
    customerId: string,
    ownerUserId: string,
    month: string,
  ): Promise<MonthlyIndicator[]> {
    const referenceMonth = parseReferenceMonth(month);

    // A customer owned by someone else reads as not found, same as the rest.
    const customer = await this.customerRepository.findOne(
      customerId,
      ownerUserId,
    );
    if (!customer) {
      throw new CustomerNotFoundError(customerId);
    }

    return this.listMonth(customerId, referenceMonth);
  }

  // Every indicator of the customer, with the month's value or null.
  async listMonth(
    customerId: string,
    referenceMonth: Date,
  ): Promise<MonthlyIndicator[]> {
    const [indicators, values] = await Promise.all([
      this.customerIndicatorRepository.findActive(customerId),
      this.recordRepository.findValuesByMonth(customerId, referenceMonth),
    ]);

    return toMonthlyIndicators(indicators, values);
  }
}
