import { Injectable } from '@nestjs/common';
import type { EsgMetricEntity } from '../../esg-metrics/domain/entities/esg-metric.entity';
import { CustomerEsgMetricRepository } from '../domain/customer-esg-metric.repository';
import { CustomerRepository } from '../domain/customers.repository';
import { CustomerNotFoundError } from '../domain/errors/customer-not-found.error';

@Injectable()
export class ListCustomerEsgMetricsUseCase {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly customerEsgMetricRepository: CustomerEsgMetricRepository,
  ) {}

  async execute(customerId: string): Promise<EsgMetricEntity[]> {
    const customer = await this.customerRepository.findOne(customerId);

    if (!customer) {
      throw new CustomerNotFoundError(customerId);
    }

    return this.customerEsgMetricRepository.findMetricsByCustomerId(customerId);
  }
}
