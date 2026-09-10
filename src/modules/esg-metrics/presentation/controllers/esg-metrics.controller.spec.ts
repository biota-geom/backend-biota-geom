import { describe, expect, it, jest } from '@jest/globals';

import { CreateCustomEsgMetricUseCase } from '../../application/use-cases/create-custom-esg-metric.use-case';
import { EsgPillar } from '../../domain/esg-pillar';
import { CreateCustomEsgMetricDto } from '../dtos/create-custom-esg-metric.dto';
import { EsgMetricsController } from './esg-metrics.controller';

describe('EsgMetricsController', () => {
  it('passes the DTO and authenticated user to the use case', async () => {
    const execute = jest
      .fn<
        (data: Record<string, unknown>) => Promise<{
          id: string;
          name: string;
          unit: string;
          pillar: EsgPillar;
          customerId: string;
          griStandardId: string;
        }>
      >()
      .mockResolvedValue({
        id: 'metric-1',
        name: 'Water consumption',
        unit: 'm3',
        pillar: EsgPillar.AMBIENTAL,
        customerId: 'client-1',
        griStandardId: '550e8400-e29b-41d4-a716-446655440000',
      });
    const controller = new EsgMetricsController({
      execute,
    } as unknown as CreateCustomEsgMetricUseCase);
    const dto = Object.assign(new CreateCustomEsgMetricDto(), {
      name: 'Water consumption',
      unit: 'm3',
      pillar: EsgPillar.AMBIENTAL,
      gri_standard_id: '550e8400-e29b-41d4-a716-446655440000',
    });

    await expect(controller.create(dto, { id: 'client-1' })).resolves.toEqual({
      id: 'metric-1',
      name: 'Water consumption',
      unit: 'm3',
      pillar: EsgPillar.AMBIENTAL,
      customer_id: 'client-1',
      gri_standard_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(execute).toHaveBeenCalledWith({
      name: 'Water consumption',
      unit: 'm3',
      pillar: EsgPillar.AMBIENTAL,
      griStandardId: '550e8400-e29b-41d4-a716-446655440000',
      customerId: 'client-1',
    });
  });
});
