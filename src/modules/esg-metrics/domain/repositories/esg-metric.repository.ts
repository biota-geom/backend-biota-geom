import type { EsgMetricEntity, EsgPillar } from '../entities/esg-metric.entity';

export type EsgMetricData = {
  name: string;
  unit: string;
  pillar: EsgPillar;
  clientId: string;
  griStandardId?: string | null;
};

export abstract class EsgMetricRepository {
  abstract create(data: EsgMetricData): Promise<EsgMetricEntity>;
}
