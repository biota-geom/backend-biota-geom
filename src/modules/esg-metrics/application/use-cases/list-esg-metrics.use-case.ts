import { Injectable } from '@nestjs/common';
import type { EsgMetricEntity } from '../../domain/entities/esg-metric.entity';
import { EsgMetricRepository } from '../../domain/repositories/esg-metric.repository';

@Injectable()
export class ListEsgMetricsUseCase {
  constructor(private readonly esgMetricRepository: EsgMetricRepository) {}

  async execute(customerId: string): Promise<EsgMetricEntity[]> {
    return this.esgMetricRepository.findVisibleToCustomer(customerId);
  }
}
