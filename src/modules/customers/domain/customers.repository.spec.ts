import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaCustomerRepository } from '../infra/prisma-customer.repository';

describe('PrismaCustomerRepository', () => {
  it('loads all customers with their nested address and sector', async () => {
    const customer = {
      findMany: jest.fn().mockResolvedValue([{ id: 'customer-1' }]),
    };
    const prisma = {
      customer,
    } as unknown as PrismaService;
    const repository = new PrismaCustomerRepository(prisma);

    await expect(repository.findAll()).resolves.toEqual([{ id: 'customer-1' }]);
    expect(customer.findMany).toHaveBeenCalledWith({
      include: {
        address: true,
        sector: true,
      },
    });
  });
});
