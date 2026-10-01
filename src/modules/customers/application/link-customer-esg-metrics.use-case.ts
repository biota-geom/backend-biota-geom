import { Injectable } from '@nestjs/common';
import { CustomerEsgMetricRepository } from '../domain/customer-esg-metric.repository';
import { CustomerRepository } from '../domain/customers.repository';
import { CustomerNotFoundError } from '../domain/errors/customer-not-found.error';
import { EsgMetricsInUseError } from '../domain/errors/esg-metrics-in-use.error';
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

    // A GRI parameter that categorizes a license condition of this customer
    // (US23) cannot be unlinked: the condition would show a category the
    // customer no longer monitors.
    const inUseMetricIds =
      await this.customerEsgMetricRepository.findMetricIdsInUseExcept(
        customerId,
        uniqueMetricIds,
      );

    if (inUseMetricIds.length > 0) {
      throw new EsgMetricsInUseError(inUseMetricIds);
    }

    await this.customerEsgMetricRepository.replaceAll(
      customerId,
      uniqueMetricIds,
    );
  }
}
