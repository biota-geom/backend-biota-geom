import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { CustomerIndicatorRepository } from '../domain/customer-indicators.repository';
import { EsgIndicatorRecordRepository } from '../domain/esg-indicator-records.repository';
import {
  EsgIndicatorsSummary,
  toIndicatorSummaries,
} from '../domain/esg-indicator-summary';
import {
  formatReferenceMonth,
  parseReferenceMonth,
  previousReferenceMonth,
} from '../domain/reference-month';

@Injectable()
export class GetEsgIndicatorsSummaryUseCase {
  constructor(
    private readonly recordRepository: EsgIndicatorRecordRepository,
    private readonly customerIndicatorRepository: CustomerIndicatorRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  /*
   * Compares every indicator of the customer in a month with the month right
   * before it. Without `month`, the most recent month that has a record is
   * used.
   */
  async execute(
    customerId: string,
    ownerUserId: string,
    month?: string,
  ): Promise<EsgIndicatorsSummary> {
    const requestedMonth =
      month === undefined ? null : parseReferenceMonth(month);

    // A customer owned by someone else reads as not found, same as the rest.
    const customer = await this.customerRepository.findOne(
      customerId,
      ownerUserId,
    );
    if (!customer) {
      throw new CustomerNotFoundError(customerId);
    }

    const [indicators, referenceMonth] = await Promise.all([
      this.customerIndicatorRepository.findActive(customerId),
      requestedMonth ?? this.recordRepository.findLatestMonth(customerId),
    ]);

    if (!referenceMonth) {
      return {
        referenceMonth: null,
        indicators: toIndicatorSummaries(indicators, new Map(), new Map()),
      };
    }

    const [current, previous] = await Promise.all([
      this.recordRepository.findValuesByMonth(customerId, referenceMonth),
      this.recordRepository.findValuesByMonth(
        customerId,
        previousReferenceMonth(referenceMonth),
      ),
    ]);

    return {
      referenceMonth: formatReferenceMonth(referenceMonth),
      indicators: toIndicatorSummaries(indicators, current, previous),
    };
  }
}
