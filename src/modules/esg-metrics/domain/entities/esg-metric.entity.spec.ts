import { EsgMetricEntity } from './esg-metric.entity';
import { EsgPillar } from '@prisma/client';
import { describe, expect, it } from '@jest/globals';

describe('EsgMetricEntity', () => {
  it('stores the metric attributes', () => {
    const entity = new EsgMetricEntity(
      'metric-1',
      'Water consumption',
      'm3',
      EsgPillar.AMBIENTAL,
      'client-1',
      null,
    );

    expect(entity).toEqual({
      id: 'metric-1',
      name: 'Water consumption',
      unit: 'm3',
      pillar: EsgPillar.AMBIENTAL,
      customerId: 'client-1',
      griStandardId: null,
    });
  });
});
