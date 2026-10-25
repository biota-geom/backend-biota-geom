import { Injectable } from '@nestjs/common';
import { CustomerEsgMetricRepository } from '../domain/customer-esg-metric.repository';
import { CustomerRepository } from '../domain/customers.repository';
import { CustomerNotFoundError } from '../domain/errors/customer-not-found.error';
import { EsgMetricsNotFoundError } from '../domain/errors/esg-metrics-not-found.error';

@Injectable()
export class LinkCustomerEsgMetricsUseCase {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly customerEsgMetricRepository: CustomerEsgMetricRepository,
  ) {}

  async execute(
    customerId: string,
    ownerUserId: string,
    metricIds: string[],
  ): Promise<void> {
    // Scoped: linking metrics is a write on the customer, so it is refused
    // (as "not found") when the customer belongs to another owner.
    const customer = await this.customerRepository.findOne(
      customerId,
      ownerUserId,
    );

    if (!customer) {
      throw new CustomerNotFoundError(customerId);
    }

    const uniqueMetricIds = [...new Set(metricIds)];

    if (uniqueMetricIds.length > 0) {
      const existingIds =
        await this.customerEsgMetricRepository.findExistingMetricIds(
          uniqueMetricIds,
        );

      if (existingIds.length !== uniqueMetricIds.length) {
        throw new EsgMetricsNotFoundError();
      }
    }

    await this.customerEsgMetricRepository.replaceAll(
      customerId,
      uniqueMetricIds,
    );
  }
}
