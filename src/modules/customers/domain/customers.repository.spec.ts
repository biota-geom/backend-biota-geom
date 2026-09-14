import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaCustomerRepository } from '../infra/prisma-customer.repository';

describe('PrismaCustomerRepository', () => {
  it('loads active customers with their nested address and sector', async () => {
    const customer = {
      findMany: jest.fn().mockResolvedValue([{ id: 'customer-1' }]),
    };
    const prisma = {
      customer,
    } as unknown as PrismaService;
    const repository = new PrismaCustomerRepository(prisma);

    await expect(repository.findAll()).resolves.toEqual([{ id: 'customer-1' }]);
    expect(customer.findMany).toHaveBeenCalledWith({
      where: { isDeleted: false },
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
      where: { id: 'customer-1', isDeleted: false },
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

  it('returns null when the requested customer is deleted', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const customer = { findMany: jest.fn(), findUnique: findOne };
    const repository = new PrismaCustomerRepository({
      customer,
    } as unknown as PrismaService);

    await expect(repository.findOne('deleted-id')).resolves.toBeNull();
    expect(findOne).toHaveBeenCalledWith({
      where: { id: 'deleted-id', isDeleted: false },
      include: { address: true, sector: true },
    });
  });

  it('marks an existing customer as deleted instead of deleting it', async () => {
    const customer = {
      findUnique: jest.fn().mockResolvedValue({ id: 'customer-1' }),
      update: jest
        .fn()
        .mockResolvedValue({ id: 'customer-1', isDeleted: true }),
    };
    const prisma = { customer } as unknown as PrismaService;
    const repository = new PrismaCustomerRepository(prisma);

    await expect(repository.remove('customer-1')).resolves.toBe(true);
    expect(customer.findUnique).toHaveBeenCalledWith({
      where: { id: 'customer-1', isDeleted: false },
      select: { id: true },
    });
    expect(customer.update).toHaveBeenCalledWith({
      where: { id: 'customer-1' },
      data: { isDeleted: true },
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
