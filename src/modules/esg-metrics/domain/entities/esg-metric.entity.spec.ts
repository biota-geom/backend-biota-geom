import { EsgMetricEntity } from './esg-metric.entity';

describe('EsgMetricEntity', () => {
  it('stores the metric attributes', () => {
    const entity = new EsgMetricEntity(
      'metric-1',
      'Water consumption',
      'm3',
      'ambiental',
      'client-1',
      null,
    );

    expect(entity).toEqual({
      id: 'metric-1',
      name: 'Water consumption',
      unit: 'm3',
      pillar: 'ambiental',
      clientId: 'client-1',
      griStandardId: null,
    });
  });
});
