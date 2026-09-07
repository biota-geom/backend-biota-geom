import { describe, expect, it, jest } from '@jest/globals';

import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaEsgMetricRepository } from './prisma-esg-metric.repository';

describe('PrismaEsgMetricRepository', () => {
  it('creates and maps a metric with a GRI standard', async () => {
    const create = jest
      .fn<(args: Record<string, unknown>) => Promise<Record<string, unknown>>>()
      .mockResolvedValue({
        id: 'metric-1',
        name: 'Water consumption',
        unit: 'm3',
        pillar: 'ambiental',
        clientId: 'client-1',
        griStandardId: 'gri-1',
      });
    const repository = new PrismaEsgMetricRepository({
      esgMetric: { create },
    } as unknown as PrismaService);

    await expect(
      repository.create({
        name: 'Water consumption',
        unit: 'm3',
        pillar: 'ambiental',
        clientId: 'client-1',
        griStandardId: 'gri-1',
      }),
    ).resolves.toEqual({
      id: 'metric-1',
      name: 'Water consumption',
      unit: 'm3',
      pillar: 'ambiental',
      clientId: 'client-1',
      griStandardId: 'gri-1',
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        name: 'Water consumption',
        unit: 'm3',
        pillar: 'ambiental',
        clientId: 'client-1',
        griStandardId: 'gri-1',
      },
    });
  });

  it('maps a missing GRI standard to null', async () => {
    const create = jest
      .fn<(args: Record<string, unknown>) => Promise<Record<string, unknown>>>()
      .mockResolvedValue({
        id: 'metric-1',
        name: 'Water consumption',
        unit: 'm3',
        pillar: 'ambiental',
        clientId: 'client-1',
        griStandardId: null,
      });
    const repository = new PrismaEsgMetricRepository({
      esgMetric: { create },
    } as unknown as PrismaService);

    await expect(
      repository.create({
        name: 'Water consumption',
        unit: 'm3',
        pillar: 'ambiental',
        clientId: 'client-1',
      }),
    ).resolves.toMatchObject({ griStandardId: null });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ griStandardId: null }),
    });
  });
});
