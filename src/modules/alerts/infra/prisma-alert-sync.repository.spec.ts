import { PrismaService } from '../../../prisma/prisma.service';
import { DesiredAlert } from '../domain/alert-generator';
import { PrismaAlertSyncRepository } from './prisma-alert-sync.repository';

describe('PrismaAlertSyncRepository', () => {
  const alert = { createMany: jest.fn(), updateMany: jest.fn() };
  const repository = new PrismaAlertSyncRepository({
    alert,
  } as unknown as PrismaService);

  it('skips the insert when there is nothing to create', async () => {
    expect(await repository.createMissing([])).toBe(0);
    expect(alert.createMany).not.toHaveBeenCalled();
  });

  it('inserts with skipDuplicates and returns the created count', async () => {
    alert.createMany.mockResolvedValue({ count: 1 });
    const data = [{ dedupeKey: 'k' }] as DesiredAlert[];
    expect(await repository.createMissing(data)).toBe(1);
    expect(alert.createMany).toHaveBeenCalledWith({
      data,
      skipDuplicates: true,
    });
  });

  it('resolves open alerts not kept, within the owner scope', async () => {
    alert.updateMany.mockResolvedValue({ count: 2 });
    expect(
      await repository.resolveStale(
        { ownerUserId: 'u' },
        'LICENSE_EXPIRATION',
        ['k'],
      ),
    ).toBe(2);
    expect(alert.updateMany).toHaveBeenCalledWith({
      where: {
        type: 'LICENSE_EXPIRATION',
        status: { in: ['OPEN', 'READ'] },
        dedupeKey: { not: null, notIn: ['k'] },
        customer: { isDeleted: false, ownerUserId: 'u' },
      },
      data: { status: 'RESOLVED' },
    });
  });
});
