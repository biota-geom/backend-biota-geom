import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaAlertResolver } from './prisma-alert-resolver';

describe('PrismaAlertResolver', () => {
  const updateMany = jest.fn();
  const resolver = new PrismaAlertResolver({
    alert: { updateMany },
  } as unknown as PrismaService);
  const pendingOnly = { status: { in: ['OPEN', 'READ'] } };
  const resolved = { data: { status: 'RESOLVED' } };

  beforeEach(() => {
    jest.resetAllMocks();
    updateMany.mockResolvedValue({ count: 2 });
  });

  it('resolves the pending alerts of a license and of its conditions', async () => {
    await expect(resolver.resolveForLicense('license-1')).resolves.toBe(2);

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { licenseId: 'license-1' },
          { licenseCondition: { licenseId: 'license-1' } },
        ],
        ...pendingOnly,
      },
      ...resolved,
    });
  });

  it('resolves the pending alerts of the given conditions', async () => {
    await expect(
      resolver.resolveForConditions(['condition-1', 'condition-2']),
    ).resolves.toBe(2);

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        licenseConditionId: { in: ['condition-1', 'condition-2'] },
        ...pendingOnly,
      },
      ...resolved,
    });
  });

  it('skips the query when there are no conditions', async () => {
    await expect(resolver.resolveForConditions([])).resolves.toBe(0);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("runs inside the caller's transaction when one is given", async () => {
    const transactionUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const transaction = {
      alert: { updateMany: transactionUpdateMany },
    } as unknown as Prisma.TransactionClient;

    await expect(
      resolver.resolveForConditions(['condition-1'], transaction),
    ).resolves.toBe(1);
    await expect(
      resolver.resolveForLicense('license-1', transaction),
    ).resolves.toBe(1);

    expect(transactionUpdateMany).toHaveBeenCalledTimes(2);
    expect(updateMany).not.toHaveBeenCalled();
  });
});
