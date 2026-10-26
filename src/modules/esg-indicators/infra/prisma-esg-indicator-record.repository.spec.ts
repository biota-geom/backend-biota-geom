import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaEsgIndicatorRecordRepository } from './prisma-esg-indicator-record.repository';

const MONTH = new Date('2026-09-01T00:00:00.000Z');

function buildRepository() {
  const upsert = jest.fn().mockResolvedValue(undefined);
  const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
  const findMany = jest.fn();
  const tx = { esgIndicatorRecord: { upsert, deleteMany, findMany } };
  const $transaction = jest.fn((callback: (client: typeof tx) => unknown) =>
    callback(tx),
  );

  const repository = new PrismaEsgIndicatorRecordRepository({
    esgIndicatorRecord: { findMany },
    $transaction,
  } as unknown as PrismaService);

  return { repository, upsert, deleteMany, findMany, $transaction };
}

describe('PrismaEsgIndicatorRecordRepository', () => {
  it('returns null for indicators without a record', async () => {
    const { repository, findMany } = buildRepository();
    findMany.mockResolvedValue([
      { indicator: 'WATER', value: new Prisma.Decimal('1250.5') },
      { indicator: 'EMPLOYEES', value: new Prisma.Decimal('148') },
    ]);

    await expect(repository.findByMonth('customer-1', MONTH)).resolves.toEqual({
      WATER: 1250.5,
      WASTE: null,
      EMPLOYEES: 148,
      ENERGY: null,
    });
    expect(findMany).toHaveBeenCalledWith({
      where: { customerId: 'customer-1', referenceMonth: MONTH },
      select: { indicator: true, value: true },
    });
  });

  it('upserts each informed indicator inside one transaction', async () => {
    const { repository, upsert, deleteMany, findMany, $transaction } =
      buildRepository();
    findMany.mockResolvedValue([
      { indicator: 'WATER', value: new Prisma.Decimal('1250.5') },
      { indicator: 'ENERGY', value: new Prisma.Decimal('53200') },
    ]);

    const result = await repository.saveMonth('customer-1', MONTH, {
      WATER: 1250.5,
      ENERGY: 53200,
    });

    expect($transaction).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenCalledWith({
      where: {
        customerId_indicator_referenceMonth: {
          customerId: 'customer-1',
          indicator: 'WATER',
          referenceMonth: MONTH,
        },
      },
      create: {
        customerId: 'customer-1',
        indicator: 'WATER',
        referenceMonth: MONTH,
        value: 1250.5,
      },
      update: { value: 1250.5 },
    });
    expect(deleteMany).not.toHaveBeenCalled();
    expect(result).toEqual({
      WATER: 1250.5,
      WASTE: null,
      EMPLOYEES: null,
      ENERGY: 53200,
    });
  });

  it('leaves omitted indicators untouched and removes the ones sent as null', async () => {
    const { repository, upsert, deleteMany, findMany } = buildRepository();
    findMany.mockResolvedValue([]);

    await repository.saveMonth('customer-1', MONTH, { WASTE: null });

    expect(upsert).not.toHaveBeenCalled();
    expect(deleteMany).toHaveBeenCalledTimes(1);
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        customerId: 'customer-1',
        indicator: 'WASTE',
        referenceMonth: MONTH,
      },
    });
  });
});
