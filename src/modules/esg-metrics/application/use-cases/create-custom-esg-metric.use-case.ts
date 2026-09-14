import { Injectable } from '@nestjs/common';
import type { EsgMetricEntity } from '../../domain/entities/esg-metric.entity';
import { EsgMetricAlreadyExistsError } from '../../domain/errors/esg-metric-already-exists.error';
import {
  EsgMetricRepository,
  type EsgMetricData,
} from '../../domain/repositories/esg-metric.repository';

@Injectable()
export class CreateCustomEsgMetricUseCase {
  constructor(private readonly esgMetricRepository: EsgMetricRepository) {}

  async execute(data: EsgMetricData): Promise<EsgMetricEntity> {
    const existing = await this.esgMetricRepository.findByCustomerIdAndName(
      data.customerId,
      data.name,
    );

    if (existing) {
      throw new EsgMetricAlreadyExistsError(data.name);
    }

    return this.esgMetricRepository.create(data);
  }
}
