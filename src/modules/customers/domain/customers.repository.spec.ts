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

  it('finds one customer by id with its address and sector', async () => {
    const findOne = jest.fn().mockResolvedValue({ id: 'customer-1' });
    const customer = { findMany: jest.fn(), findUnique: findOne };
    const repository = new PrismaCustomerRepository({
      customer,
    } as unknown as PrismaService);

    await expect(repository.findOne('customer-1')).resolves.toEqual({
      id: 'customer-1',
    });
    expect(findOne).toHaveBeenCalledWith({
      where: { id: 'customer-1' },
      include: { address: true, sector: true },
    });
  });

  it('returns null when the requested customer does not exist', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const customer = { findMany: jest.fn(), findUnique: findOne };
    const repository = new PrismaCustomerRepository({
      customer,
    } as unknown as PrismaService);

    await expect(repository.findOne('missing-id')).resolves.toBeNull();
  });
});
