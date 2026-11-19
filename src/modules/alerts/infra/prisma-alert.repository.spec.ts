import { Prisma, Alert as PrismaAlert } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaAlertRepository } from './prisma-alert.repository';

describe('PrismaAlertRepository', () => {
  const row = {
    id: 'alert',
    type: 'CONDITION_DUE' as const,
    severity: 'HIGH' as const,
    status: 'OPEN' as const,
    dueDate: new Date('2026-11-10'),
    createdAt: new Date('2026-11-01'),
    customer: { id: 'company', name: 'Site' },
    license: { id: 'license', type: 'LO', processNumber: '123/2024' },
    licenseCondition: { id: 'condition', name: 'Monitoring' },
  };
  const scopedWhere = {
    customer: { ownerUserId: 'owner', isDeleted: false },
    license: {
      status: { not: 'ARCHIVED' },
      customer: { ownerUserId: 'owner', isDeleted: false },
    },
    dueDate: { not: null },
    OR: [
      { type: 'LICENSE_EXPIRATION', licenseConditionId: null },
      {
        type: 'CONDITION_DUE',
        licenseCondition: {
          license: {
            status: { not: 'ARCHIVED' },
            customer: { ownerUserId: 'owner', isDeleted: false },
          },
        },
      },
    ],
  };
  const alert = {
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    findFirst: jest.fn(),
  };
  const transactionAlert = { updateMany: jest.fn(), findFirst: jest.fn() };
  const transaction = jest.fn();
  const repository = new PrismaAlertRepository({
    alert,
    $transaction: transaction,
  } as unknown as PrismaService);

  beforeEach(() => jest.resetAllMocks());

  it('uses the same tenant/status filters for items and total with stable database pagination', async () => {
    alert.findMany.mockResolvedValue([row]);
    alert.count.mockResolvedValue(21);
    transaction.mockImplementation((queries: Promise<unknown>[]) =>
      Promise.all(queries),
    );
    const result = await repository.list('owner', {
      status: ['OPEN', 'READ'],
      page: 2,
      pageSize: 10,
    });
    const where = { ...scopedWhere, status: { in: ['OPEN', 'READ'] } };
    expect(alert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where,
        skip: 10,
        take: 10,
        orderBy: [{ severity: 'desc' }, { dueDate: 'asc' }, { id: 'asc' }],
      }),
    );
    expect(alert.count).toHaveBeenCalledWith({ where });
    expect(transaction).toHaveBeenCalledWith(expect.any(Array), {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
    expect(result).toEqual({
      items: [
        {
          id: row.id,
          type: row.type,
          severity: row.severity,
          status: row.status,
          dueDate: row.dueDate,
          createdAt: row.createdAt,
          customer: row.customer,
          license: row.license,
          condition: row.licenseCondition,
        },
      ],
      total: 21,
      page: 2,
      pageSize: 10,
    });
  });

  it('counts only visible OPEN alerts', async () => {
    alert.count.mockResolvedValue(3);
    expect(await repository.countUnread('owner')).toBe(3);
    expect(alert.count).toHaveBeenCalledWith({
      where: { ...scopedWhere, status: 'OPEN' },
    });
  });

  it('applies optional filters to both the page and total count', async () => {
    alert.findMany.mockResolvedValue([]);
    alert.count.mockResolvedValue(2);
    transaction.mockImplementation((queries: Promise<unknown>[]) =>
      Promise.all(queries),
    );
    await repository.list('owner', {
      status: ['READ', 'RESOLVED'],
      customerId: 'company',
      type: ['CONDITION_DUE'],
      severity: ['HIGH', 'MEDIUM'],
      page: 1,
      pageSize: 10,
    });
    const where = {
      ...scopedWhere,
      status: { in: ['READ', 'RESOLVED'] },
      customerId: 'company',
      type: { in: ['CONDITION_DUE'] },
      severity: { in: ['HIGH', 'MEDIUM'] },
    };
    expect(alert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where }),
    );
    expect(alert.count).toHaveBeenCalledWith({ where });
  });

  it('marks only visible OPEN alerts as read, optionally for one company', async () => {
    alert.updateMany.mockResolvedValue({ count: 2 });
    expect(await repository.markAllRead('owner', 'company')).toBe(2);
    expect(alert.updateMany).toHaveBeenCalledWith({
      where: { ...scopedWhere, status: 'OPEN', customerId: 'company' },
      data: { status: 'READ' },
    });

    alert.updateMany.mockResolvedValue({ count: 3 });
    expect(await repository.markAllRead('owner')).toBe(3);
    expect(alert.updateMany).toHaveBeenLastCalledWith({
      where: { ...scopedWhere, status: 'OPEN' },
      data: { status: 'READ' },
    });
  });

  describe('status updates', () => {
    beforeEach(() => {
      transaction.mockImplementation(
        (
          callback: (client: {
            alert: typeof transactionAlert;
          }) => Promise<unknown>,
        ) => callback({ alert: transactionAlert }),
      );
    });

    it('scopes both the write and read inside the same transaction', async () => {
      transactionAlert.updateMany.mockResolvedValue({ count: 1 });
      transactionAlert.findFirst.mockResolvedValue({
        ...row,
        type: 'LICENSE_EXPIRATION',
        licenseCondition: null,
        status: 'READ',
      });
      expect(
        await repository.updateStatus('owner', 'alert', 'READ'),
      ).toMatchObject({ id: 'alert', status: 'READ', condition: null });
      const where = { ...scopedWhere, id: 'alert' };
      expect(transactionAlert.updateMany).toHaveBeenCalledWith({
        where,
        data: { status: 'READ' },
      });
      expect(transactionAlert.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where }),
      );
      expect(alert.updateMany).not.toHaveBeenCalled();
    });

    it('returns null without reading when no visible alert was updated', async () => {
      transactionAlert.updateMany.mockResolvedValue({ count: 0 });
      expect(
        await repository.updateStatus('owner', 'foreign-alert', 'READ'),
      ).toBeNull();
      expect(transactionAlert.findFirst).not.toHaveBeenCalled();
    });

    it('returns null if the updated alert is no longer visible', async () => {
      transactionAlert.updateMany.mockResolvedValue({ count: 1 });
      transactionAlert.findFirst.mockResolvedValue(null);
      expect(
        await repository.updateStatus('owner', 'alert', 'RESOLVED'),
      ).toBeNull();
    });
  });

  it.each([
    { license: null },
    { dueDate: null },
    { type: 'NEW_LEGISLATION' as PrismaAlert['type'] },
  ])(
    'rejects unsupported persistence records instead of returning a broken contract: %j',
    async (override) => {
      alert.findMany.mockResolvedValue([{ ...row, ...override }]);
      alert.count.mockResolvedValue(1);
      transaction.mockImplementation((queries: Promise<unknown>[]) =>
        Promise.all(queries),
      );
      await expect(
        repository.list('owner', { status: ['OPEN'], page: 1, pageSize: 10 }),
      ).rejects.toThrow('Unsupported alert record');
    },
  );
});
