import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaEsgIndicatorRecordRepository } from './prisma-esg-indicator-record.repository';

const MONTH = new Date('2026-09-01T00:00:00.000Z');

function buildRepository() {
  const upsert = jest.fn().mockResolvedValue(undefined);
  const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
  const findMany = jest.fn();
  const findFirst = jest.fn();
  const tx = { esgIndicatorRecord: { upsert, deleteMany } };
  const $transaction = jest.fn((callback: (client: typeof tx) => unknown) =>
    callback(tx),
  );

  const repository = new PrismaEsgIndicatorRecordRepository({
    esgIndicatorRecord: { findMany, findFirst },
    $transaction,
  } as unknown as PrismaService);

  return { repository, upsert, deleteMany, findMany, findFirst, $transaction };
}

describe('PrismaEsgIndicatorRecordRepository', () => {
  it('returns the most recent month of an indicator still linked to the customer', async () => {
    const { repository, findFirst } = buildRepository();
    findFirst.mockResolvedValue({ referenceMonth: MONTH });

    await expect(repository.findLatestMonth('customer-1')).resolves.toEqual(
      MONTH,
    );
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        customerId: 'customer-1',
        indicator: { customerLinks: { some: { customerId: 'customer-1' } } },
      },
      orderBy: { referenceMonth: 'desc' },
      select: { referenceMonth: true },
    });
  });

  it('returns null as the latest month when there is no record', async () => {
    const { repository, findFirst } = buildRepository();
    findFirst.mockResolvedValue(null);

    await expect(repository.findLatestMonth('customer-1')).resolves.toBeNull();
  });

  it('maps the stored values by indicator id', async () => {
    const { repository, findMany } = buildRepository();
    findMany.mockResolvedValue([
      { indicatorId: 'ind-1', value: new Prisma.Decimal('1250.5') },
      { indicatorId: 'ind-3', value: new Prisma.Decimal('85') },
    ]);

    await expect(
      repository.findValuesByMonth('customer-1', MONTH),
    ).resolves.toEqual(
      new Map([
        ['ind-1', 1250.5],
        ['ind-3', 85],
      ]),
    );
    expect(findMany).toHaveBeenCalledWith({
      where: { customerId: 'customer-1', referenceMonth: MONTH },
      select: { indicatorId: true, value: true },
    });
  });

  it('upserts each informed indicator inside one transaction', async () => {
    const { repository, upsert, deleteMany, $transaction } = buildRepository();

    await repository.saveMonth('customer-1', MONTH, [
      { indicatorId: 'ind-1', value: 1250.5 },
      { indicatorId: 'ind-3', value: 0 },
    ]);

    expect($transaction).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenCalledWith({
      where: {
        customerId_indicatorId_referenceMonth: {
          customerId: 'customer-1',
          indicatorId: 'ind-1',
          referenceMonth: MONTH,
        },
      },
      create: {
        customerId: 'customer-1',
        indicatorId: 'ind-1',
        referenceMonth: MONTH,
        value: 1250.5,
      },
      update: { value: 1250.5 },
    });
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('removes the record of an indicator saved as null', async () => {
    const { repository, upsert, deleteMany } = buildRepository();

    await repository.saveMonth('customer-1', MONTH, [
      { indicatorId: 'ind-1', value: null },
    ]);

    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        customerId: 'customer-1',
        indicatorId: 'ind-1',
        referenceMonth: MONTH,
      },
    });
    expect(upsert).not.toHaveBeenCalled();
  });
});
