import { Injectable } from '@nestjs/common';
import { EsgMetricRepository } from '../../esg-metrics/domain/repositories/esg-metric.repository';
import { Customer } from '../domain/customer.entity';
import { CustomerRepository } from '../domain/customers.repository';
import { CustomerNotFoundError } from '../domain/errors/customer-not-found.error';
import { InvalidEsgIndicatorIdsError } from '../domain/errors/invalid-esg-indicator-ids.error';
import type { UpdateCustomerData } from '../domain/update-customer.data';

@Injectable()
export class UpdateCustomerUseCase {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly esgMetricRepository: EsgMetricRepository,
  ) {}

  async execute(id: string, data: UpdateCustomerData): Promise<Customer> {
    const existing = await this.customerRepository.findById(id);

    if (!existing) {
      throw new CustomerNotFoundError(id);
    }

    if (data.esgIndicatorIds.length > 0) {
      const foundMetrics = await this.esgMetricRepository.findByIds(
        data.esgIndicatorIds,
      );
      const foundIds = new Set(foundMetrics.map((metric) => metric.id));
      const invalidIds = data.esgIndicatorIds.filter(
        (indicatorId) => !foundIds.has(indicatorId),
      );

      if (invalidIds.length > 0) {
        throw new InvalidEsgIndicatorIdsError(invalidIds);
      }
    }

    return this.customerRepository.update(id, data);
  }
}
