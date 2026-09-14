import { Injectable } from '@nestjs/common';
import type { EsgMetricEntity } from '../../esg-metrics/domain/entities/esg-metric.entity';

@Injectable()
export abstract class CustomerEsgMetricRepository {
  abstract replaceAll(customerId: string, metricIds: string[]): Promise<void>;
  abstract findMetricsByCustomerId(
    customerId: string,
  ): Promise<EsgMetricEntity[]>;
  abstract findExistingMetricIds(metricIds: string[]): Promise<string[]>;
}
