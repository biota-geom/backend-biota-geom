import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { CustomerIndicatorRepository } from '../domain/customer-indicators.repository';
import { DuplicatedIndicatorRecordError } from '../domain/errors/duplicated-indicator-record.error';
import { IndicatorNotConfiguredError } from '../domain/errors/indicator-not-configured.error';
import {
  IndicatorRecordChange,
  MonthlyIndicator,
} from '../domain/esg-indicator';
import { EsgIndicatorRecordRepository } from '../domain/esg-indicator-records.repository';
import { parseReferenceMonth } from '../domain/reference-month';
import { GetEsgIndicatorsUseCase } from './get-esg-indicators.use-case';

export interface SaveEsgIndicatorsInput {
  customerId: string;
  ownerUserId: string;
  month: string;
  records: IndicatorRecordChange[];
}

@Injectable()
export class SaveEsgIndicatorsUseCase {
  constructor(
    private readonly recordRepository: EsgIndicatorRecordRepository,
    private readonly customerIndicatorRepository: CustomerIndicatorRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly getEsgIndicators: GetEsgIndicatorsUseCase,
  ) {}

  async execute(input: SaveEsgIndicatorsInput): Promise<MonthlyIndicator[]> {
    const referenceMonth = parseReferenceMonth(input.month);

    const customer = await this.customerRepository.findOne(
      input.customerId,
      input.ownerUserId,
    );
    if (!customer) {
      throw new CustomerNotFoundError(input.customerId);
    }

    this.assertNoDuplicates(input.records);
    await this.assertAllConfigured(input.customerId, input.records);

    if (input.records.length > 0) {
      await this.recordRepository.saveMonth(
        input.customerId,
        referenceMonth,
        input.records,
      );
    }

    return this.getEsgIndicators.listMonth(input.customerId, referenceMonth);
  }

  private assertNoDuplicates(records: IndicatorRecordChange[]): void {
    const seen = new Set<string>();

    for (const { indicatorId } of records) {
      if (seen.has(indicatorId)) {
        throw new DuplicatedIndicatorRecordError(indicatorId);
      }
      seen.add(indicatorId);
    }
  }

  // Only the indicators linked to this customer can receive a value, so one
  // account can never write to another customer's (or a removed) indicator.
  private async assertAllConfigured(
    customerId: string,
    records: IndicatorRecordChange[],
  ): Promise<void> {
    const active =
      await this.customerIndicatorRepository.findActive(customerId);
    const activeIds = new Set(active.map((indicator) => indicator.id));
    const unknown = records
      .map((record) => record.indicatorId)
      .filter((indicatorId) => !activeIds.has(indicatorId));

    if (unknown.length > 0) {
      throw new IndicatorNotConfiguredError(unknown);
    }
  }
}
