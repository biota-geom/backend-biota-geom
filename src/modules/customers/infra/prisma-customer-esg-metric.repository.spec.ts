import { describe, expect, it, jest } from '@jest/globals';
import { EsgPillar, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { EsgMetricsNotFoundError } from '../domain/errors/esg-metrics-not-found.error';
import { PrismaCustomerEsgMetricRepository } from './prisma-customer-esg-metric.repository';

const CUSTOMER_ID = 'customer-1';
const METRIC_ID = 'metric-1';

const ROW = {
  id: METRIC_ID,
  name: 'Water consumption',
  unit: 'm3',
  pillar: EsgPillar.AMBIENTAL,
  customerId: null,
  griStandardId: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

function buildRepository() {
  const deleteMany = jest.fn<
    (args: Record<string, unknown>) => Promise<{ count: number }>
  >(() => Promise.resolve({ count: 1 }));
  const createMany = jest.fn<
    (args: Record<string, unknown>) => Promise<{ count: number }>
  >(() => Promise.resolve({ count: 1 }));
  const findMany =
    jest.fn<(args: Record<string, unknown>) => Promise<unknown>>();
  const $transaction = jest.fn(
    async (callback: (tx: unknown) => Promise<void>) =>
      callback({
        customerEsgMetric: { deleteMany, createMany },
      }),
  );

  const repository = new PrismaCustomerEsgMetricRepository({
    $transaction,
    esgMetric: { findMany },
  } as unknown as PrismaService);

  return { repository, deleteMany, createMany, findMany, $transaction };
}

describe('PrismaCustomerEsgMetricRepository', () => {
  it('deletes previous links and inserts the new ones in a transaction', async () => {
    const { repository, deleteMany, createMany } = buildRepository();

    await repository.replaceAll(CUSTOMER_ID, [METRIC_ID]);

    expect(deleteMany).toHaveBeenCalledWith({
      where: { customerId: CUSTOMER_ID },
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [{ customerId: CUSTOMER_ID, esgMetricId: METRIC_ID }],
    });
  });

  it('deletes links and skips insert when the list is empty', async () => {
    const { repository, deleteMany, createMany } = buildRepository();

    await repository.replaceAll(CUSTOMER_ID, []);

    expect(deleteMany).toHaveBeenCalledWith({
      where: { customerId: CUSTOMER_ID },
    });
    expect(createMany).not.toHaveBeenCalled();
  });

  it('translates a foreign-key violation into EsgMetricsNotFoundError', async () => {
    const { repository, $transaction } = buildRepository();
    $transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('FK failed', {
        code: 'P2003',
        clientVersion: '7.9.1',
      }),
    );

    await expect(
      repository.replaceAll(CUSTOMER_ID, [METRIC_ID]),
    ).rejects.toThrow(EsgMetricsNotFoundError);
  });

  it('propagates an unrelated Prisma error unchanged', async () => {
    const { repository, $transaction } = buildRepository();
    const otherError = new Prisma.PrismaClientKnownRequestError('Other', {
      code: 'P2025',
      clientVersion: '7.9.1',
    });
    $transaction.mockRejectedValue(otherError);

    await expect(repository.replaceAll(CUSTOMER_ID, [METRIC_ID])).rejects.toBe(
      otherError,
    );
  });

  it('lists metrics linked to the customer ordered by pillar and name', async () => {
    const { repository, findMany } = buildRepository();
    findMany.mockResolvedValue([ROW]);

    await expect(
      repository.findMetricsByCustomerId(CUSTOMER_ID),
    ).resolves.toEqual([
      {
        id: METRIC_ID,
        name: 'Water consumption',
        unit: 'm3',
        pillar: EsgPillar.AMBIENTAL,
        customerId: null,
        griStandardId: null,
      },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        customerLinks: { some: { customerId: CUSTOMER_ID } },
      },
      orderBy: [{ pillar: 'asc' }, { name: 'asc' }],
    });
  });

  it('returns existing metric ids', async () => {
    const { repository, findMany } = buildRepository();
    findMany.mockResolvedValue([{ id: METRIC_ID }]);

    await expect(
      repository.findExistingMetricIds([METRIC_ID, 'missing']),
    ).resolves.toEqual([METRIC_ID]);
    expect(findMany).toHaveBeenCalledWith({
      where: { id: { in: [METRIC_ID, 'missing'] } },
      select: { id: true },
    });
  });
});
