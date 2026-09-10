import type { EsgMetricEntity } from '../entities/esg-metric.entity';
import type { EsgPillar } from '../esg-pillar';

export type EsgMetricData = {
  name: string;
  unit: string;
  pillar: EsgPillar;
  customerId: string;
  griStandardId?: string | null;
};

export abstract class EsgMetricRepository {
  abstract create(data: EsgMetricData): Promise<EsgMetricEntity>;
  abstract findVisibleToCustomer(
    customerId: string,
  ): Promise<EsgMetricEntity[]>;
  abstract findByCustomerIdAndName(
    customerId: string,
    name: string,
  ): Promise<EsgMetricEntity | null>;
}
