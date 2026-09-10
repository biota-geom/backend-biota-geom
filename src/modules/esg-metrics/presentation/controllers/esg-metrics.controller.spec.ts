import { describe, expect, it, jest } from '@jest/globals';

import { CreateCustomEsgMetricUseCase } from '../../application/use-cases/create-custom-esg-metric.use-case';
import { ListEsgMetricsUseCase } from '../../application/use-cases/list-esg-metrics.use-case';
import { EsgPillar } from '../../domain/esg-pillar';
import { CreateCustomEsgMetricDto } from '../dtos/create-custom-esg-metric.dto';
import { EsgMetricsController } from './esg-metrics.controller';

describe('EsgMetricsController', () => {
  function buildController() {
    const createExecute = jest.fn<
      (data: Record<string, unknown>) => Promise<{
        id: string;
        name: string;
        unit: string;
        pillar: EsgPillar;
        customerId: string | null;
        griStandardId: string | null;
      }>
    >();
    const listExecute = jest.fn<
      (customerId: string) => Promise<
        {
          id: string;
          name: string;
          unit: string;
          pillar: EsgPillar;
          customerId: string | null;
          griStandardId: string | null;
        }[]
      >
    >();
    const controller = new EsgMetricsController(
      { execute: createExecute } as unknown as CreateCustomEsgMetricUseCase,
      { execute: listExecute } as unknown as ListEsgMetricsUseCase,
    );

    return { controller, createExecute, listExecute };
  }

  it('passes the DTO and authenticated user to the use case', async () => {
    const { controller, createExecute } = buildController();
    createExecute.mockResolvedValue({
      id: 'metric-1',
      name: 'Water consumption',
      unit: 'm3',
      pillar: EsgPillar.AMBIENTAL,
      customerId: 'client-1',
      griStandardId: '550e8400-e29b-41d4-a716-446655440000',
    });
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
    expect(createExecute).toHaveBeenCalledWith({
      name: 'Water consumption',
      unit: 'm3',
      pillar: EsgPillar.AMBIENTAL,
      griStandardId: '550e8400-e29b-41d4-a716-446655440000',
      customerId: 'client-1',
    });
  });

  it('lists visible metrics for the authenticated user', async () => {
    const { controller, listExecute } = buildController();
    listExecute.mockResolvedValue([
      {
        id: 'global-metric',
        name: 'Water consumption',
        unit: 'm3',
        pillar: EsgPillar.AMBIENTAL,
        customerId: null,
        griStandardId: null,
      },
      {
        id: 'custom-metric',
        name: 'Chemical effluents',
        unit: 'm3',
        pillar: EsgPillar.AMBIENTAL,
        customerId: 'client-1',
        griStandardId: '550e8400-e29b-41d4-a716-446655440000',
      },
    ]);

    await expect(controller.list({ id: 'client-1' })).resolves.toEqual([
      {
        id: 'global-metric',
        name: 'Water consumption',
        unit: 'm3',
        pillar: EsgPillar.AMBIENTAL,
        customer_id: null,
        gri_standard_id: null,
      },
      {
        id: 'custom-metric',
        name: 'Chemical effluents',
        unit: 'm3',
        pillar: EsgPillar.AMBIENTAL,
        customer_id: 'client-1',
        gri_standard_id: '550e8400-e29b-41d4-a716-446655440000',
      },
    ]);
    expect(listExecute).toHaveBeenCalledWith('client-1');
  });
});
