import type { EsgPillar } from '../esg-pillar';

export class EsgMetricEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly unit: string,
    public readonly pillar: EsgPillar,
    public readonly customerId: string | null,
    public readonly griStandardId: string | null,
  ) {}
}
