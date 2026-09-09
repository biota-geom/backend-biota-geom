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

  it('deactivates an existing customer instead of deleting it', async () => {
    const customer = {
      findUnique: jest.fn().mockResolvedValue({ id: 'customer-1' }),
      update: jest
        .fn()
        .mockResolvedValue({ id: 'customer-1', isActive: false }),
    };
    const prisma = { customer } as unknown as PrismaService;
    const repository = new PrismaCustomerRepository(prisma);

    await expect(repository.remove('customer-1')).resolves.toBe(true);
    expect(customer.findUnique).toHaveBeenCalledWith({
      where: { id: 'customer-1' },
      select: { id: true },
    });
    expect(customer.update).toHaveBeenCalledWith({
      where: { id: 'customer-1' },
      data: { isActive: false },
    });
  });

  it('returns false when the customer does not exist', async () => {
    const customer = {
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    };
    const prisma = { customer } as unknown as PrismaService;
    const repository = new PrismaCustomerRepository(prisma);

    await expect(repository.remove('missing-id')).resolves.toBe(false);
    expect(customer.update).not.toHaveBeenCalled();
  });
});
