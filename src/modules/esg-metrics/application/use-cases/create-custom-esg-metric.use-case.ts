import { Injectable } from '@nestjs/common';
import type { EsgMetricEntity } from '../../domain/entities/esg-metric.entity';
import {
  EsgMetricRepository,
  type EsgMetricData,
} from '../../domain/repositories/esg-metric.repository';

@Injectable()
export class CreateCustomEsgMetricUseCase {
  constructor(private readonly esgMetricRepository: EsgMetricRepository) {}

  async execute(data: EsgMetricData): Promise<EsgMetricEntity> {
    return this.esgMetricRepository.create(data);
  }
}
