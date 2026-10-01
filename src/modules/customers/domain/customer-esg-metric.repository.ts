import { Injectable } from '@nestjs/common';
import type { EsgMetricEntity } from '../../esg-metrics/domain/entities/esg-metric.entity';

@Injectable()
export abstract class CustomerEsgMetricRepository {
  abstract replaceAll(customerId: string, metricIds: string[]): Promise<void>;
  abstract findMetricsByCustomerId(
    customerId: string,
  ): Promise<EsgMetricEntity[]>;
  abstract findExistingMetricIds(metricIds: string[]): Promise<string[]>;
  /*
   * Metric ids used as the category of any license condition of the customer,
   * excluding the ones in keptMetricIds.
   */
  abstract findMetricIdsInUseExcept(
    customerId: string,
    keptMetricIds: string[],
  ): Promise<string[]>;
  abstract findLinkedMetricIds(
    customerId: string,
    metricIds: string[],
  ): Promise<string[]>;
}
