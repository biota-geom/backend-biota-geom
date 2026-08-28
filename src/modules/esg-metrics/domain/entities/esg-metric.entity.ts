export type EsgPillar = 'ambiental' | 'social' | 'governanca';

export class EsgMetricEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly unit: string,
    public readonly pillar: EsgPillar,
    public readonly clientId: string | null,
    public readonly griStandardId: string | null,
  ) {}
}
