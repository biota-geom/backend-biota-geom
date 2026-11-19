import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaConditionDueSource } from './prisma-condition-due.source';

describe('PrismaConditionDueSource', () => {
  it('lists unfulfilled conditions of live licenses in scope', async () => {
    const dueDate = new Date('2026-06-06T00:00:00Z');
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'c',
        licenseId: 'l',
        dueDate,
        alertDate: null,
        license: { customerId: 'customer' },
      },
    ]);
    const source = new PrismaConditionDueSource({
      licenseCondition: { findMany },
    } as unknown as PrismaService);

    expect(await source.list({ ownerUserId: 'u' })).toEqual([
      {
        id: 'c',
        licenseId: 'l',
        customerId: 'customer',
        dueDate,
        alertDate: null,
      },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        conditionStatus: { not: 'FULFILLED' },
        license: {
          status: { not: 'ARCHIVED' },
          customer: { isDeleted: false, ownerUserId: 'u' },
        },
      },
      select: {
        id: true,
        licenseId: true,
        dueDate: true,
        alertDate: true,
        license: { select: { customerId: true } },
      },
    });
  });
});
