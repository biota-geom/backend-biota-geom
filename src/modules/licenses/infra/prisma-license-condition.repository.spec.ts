import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaLicenseConditionRepository } from './prisma-license-condition.repository';

describe('PrismaLicenseConditionRepository', () => {
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
