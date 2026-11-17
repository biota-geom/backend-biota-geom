import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaLicenseExpirationSource } from './prisma-license-expiration.source';

describe('PrismaLicenseExpirationSource', () => {
  it('lists licenses of live customers in scope', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'l' }]);
    const source = new PrismaLicenseExpirationSource({
      license: { findMany },
    } as unknown as PrismaService);

    expect(await source.list({ ownerUserId: 'u' })).toEqual([{ id: 'l' }]);
    expect(findMany).toHaveBeenCalledWith({
      where: { customer: { isDeleted: false, ownerUserId: 'u' } },
      select: {
        id: true,
        customerId: true,
        status: true,
        expirationDate: true,
      },
    });
  });
});
