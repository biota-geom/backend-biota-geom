import type { EsgMetricEntity } from '../entities/esg-metric.entity';
import type { EsgPillar } from '@prisma/client';

export type EsgMetricData = {
  name: string;
  unit: string;
  pillar: EsgPillar;
  customerId: string;
  griStandardId?: string | null;
};

export abstract class EsgMetricRepository {
  abstract create(data: EsgMetricData): Promise<EsgMetricEntity>;
}
