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

  it('finds a customer by id', async () => {
    const customer = {
      findMany: jest.fn(),
      findUnique: jest.fn().mockResolvedValue({ id: 'customer-1' }),
    };
    const prisma = { customer } as unknown as PrismaService;
    const repository = new PrismaCustomerRepository(prisma);

    await expect(repository.findById('customer-1')).resolves.toEqual({
      id: 'customer-1',
    });
    expect(customer.findUnique).toHaveBeenCalledWith({
      where: { id: 'customer-1' },
    });
  });

  it('returns null when the customer does not exist', async () => {
    const customer = {
      findMany: jest.fn(),
      findUnique: jest.fn().mockResolvedValue(null),
    };
    const prisma = { customer } as unknown as PrismaService;
    const repository = new PrismaCustomerRepository(prisma);

    await expect(repository.findById('missing')).resolves.toBeNull();
  });
});
