import { LicenseConditionStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaLicenseConditionRepository } from './prisma-license-condition.repository';

describe('PrismaLicenseConditionRepository', () => {
  it('creates all conditions in one transaction', async () => {
    const created = [{ id: 'condition-1' }];
    const create = jest.fn().mockReturnValue({ operation: 'create' });
    const transaction = jest.fn().mockResolvedValue(created);
    const repository = new PrismaLicenseConditionRepository({
      licenseCondition: { create },
      $transaction: transaction,
    } as unknown as PrismaService);
    const conditions = [
      {
        licenseId: 'license-1',
        name: 'MTR',
        category: 'Resíduos',
        responsibleAgency: 'FEPAM',
        dueDate: new Date('2027-05-20T00:00:00.000Z'),
        status: LicenseConditionStatus.REGULAR,
      },
    ];

    await expect(repository.addMany(conditions)).resolves.toEqual(created);
    expect(create).toHaveBeenCalledWith({ data: conditions[0] });
    expect(transaction).toHaveBeenCalledWith([{ operation: 'create' }]);
  });

  it('finds all license conditions by customer through the license relation', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'condition-1' }]);
    const repository = new PrismaLicenseConditionRepository({
      licenseCondition: { findMany },
    } as unknown as PrismaService);

    await expect(repository.findAllByCustomerId('customer-1')).resolves.toEqual(
      [{ id: 'condition-1' }],
    );
    expect(findMany).toHaveBeenCalledWith({
      where: { license: { customerId: 'customer-1' } },
      orderBy: { dueDate: 'asc' },
    });
  });
});
