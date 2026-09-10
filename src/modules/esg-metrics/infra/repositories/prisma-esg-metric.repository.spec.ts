import { describe, expect, it, jest } from '@jest/globals';
import { Prisma, EsgPillar } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { EsgMetricAlreadyExistsError } from '../../domain/errors/esg-metric-already-exists.error';
import { PrismaEsgMetricRepository } from './prisma-esg-metric.repository';

const ROW = {
  id: 'metric-1',
  name: 'Water consumption',
  unit: 'm3',
  pillar: EsgPillar.AMBIENTAL,
  customerId: 'client-1',
  griStandardId: 'gri-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

function buildRepository() {
  const create = jest.fn<(args: Record<string, unknown>) => Promise<unknown>>();
  const findUnique =
    jest.fn<(args: Record<string, unknown>) => Promise<unknown>>();
  const findMany =
    jest.fn<(args: Record<string, unknown>) => Promise<unknown>>();
  const repository = new PrismaEsgMetricRepository({
    esgMetric: { create, findMany, findUnique },
  } as unknown as PrismaService);

  return { repository, create, findMany, findUnique };
}

describe('PrismaEsgMetricRepository', () => {
  it('creates and maps a metric with a GRI standard', async () => {
    const { repository, create } = buildRepository();
    create.mockResolvedValue(ROW);

    await expect(
      repository.create({
        name: 'Water consumption',
        unit: 'm3',
        pillar: EsgPillar.AMBIENTAL,
        customerId: 'client-1',
        griStandardId: 'gri-1',
      }),
    ).resolves.toEqual({
      id: 'metric-1',
      name: 'Water consumption',
      unit: 'm3',
      pillar: EsgPillar.AMBIENTAL,
      customerId: 'client-1',
      griStandardId: 'gri-1',
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        name: 'Water consumption',
        unit: 'm3',
        pillar: EsgPillar.AMBIENTAL,
        customerId: 'client-1',
        griStandardId: 'gri-1',
      },
    });
  });

  it('maps a missing GRI standard to null', async () => {
    const { repository, create } = buildRepository();
    create.mockResolvedValue({ ...ROW, griStandardId: null });

    await expect(
      repository.create({
        name: 'Water consumption',
        unit: 'm3',
        pillar: EsgPillar.AMBIENTAL,
        customerId: 'client-1',
      }),
    ).resolves.toMatchObject({ griStandardId: null });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customerId: 'client-1',
        griStandardId: null,
      }),
    });
  });

  it('translates a unique-constraint violation into EsgMetricAlreadyExistsError', async () => {
    const { repository, create } = buildRepository();
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.9.1',
      }),
    );

    await expect(
      repository.create({
        name: 'Water consumption',
        unit: 'm3',
        pillar: EsgPillar.AMBIENTAL,
        customerId: 'client-1',
      }),
    ).rejects.toThrow(EsgMetricAlreadyExistsError);
  });

  it('propagates an unrelated Prisma error unchanged', async () => {
    const { repository, create } = buildRepository();
    const otherError = new Prisma.PrismaClientKnownRequestError(
      'Some other failure',
      {
        code: 'P2025',
        clientVersion: '7.9.1',
      },
    );
    create.mockRejectedValue(otherError);

    await expect(
      repository.create({
        name: 'Water consumption',
        unit: 'm3',
        pillar: EsgPillar.AMBIENTAL,
        customerId: 'client-1',
      }),
    ).rejects.toBe(otherError);
  });

  it('finds a metric by customer and name', async () => {
    const { repository, findUnique } = buildRepository();
    findUnique.mockResolvedValue(ROW);

    await expect(
      repository.findByCustomerIdAndName('client-1', 'Water consumption'),
    ).resolves.toMatchObject({ id: 'metric-1' });
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        customerId_name: { customerId: 'client-1', name: 'Water consumption' },
      },
    });
  });

  it('returns null when no metric matches customer and name', async () => {
    const { repository, findUnique } = buildRepository();
    findUnique.mockResolvedValue(null);

    await expect(
      repository.findByCustomerIdAndName('client-1', 'Unknown'),
    ).resolves.toBeNull();
  });

  it('lists global and customer metrics ordered by pillar and name', async () => {
    const { repository, findMany } = buildRepository();
    findMany.mockResolvedValue([
      { ...ROW, id: 'global-metric', customerId: null },
      { ...ROW, id: 'customer-metric', customerId: 'client-1' },
    ]);

    await expect(repository.findVisibleToCustomer('client-1')).resolves.toEqual(
      [
        {
          id: 'global-metric',
          name: 'Water consumption',
          unit: 'm3',
          pillar: EsgPillar.AMBIENTAL,
          customerId: null,
          griStandardId: 'gri-1',
        },
        {
          id: 'customer-metric',
          name: 'Water consumption',
          unit: 'm3',
          pillar: EsgPillar.AMBIENTAL,
          customerId: 'client-1',
          griStandardId: 'gri-1',
        },
      ],
    );
    expect(findMany).toHaveBeenCalledWith({
      where: {
        OR: [{ customerId: null }, { customerId: 'client-1' }],
      },
      orderBy: [{ pillar: 'asc' }, { name: 'asc' }],
    });
  });
});
