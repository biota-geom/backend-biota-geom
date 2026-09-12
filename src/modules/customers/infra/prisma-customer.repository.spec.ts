import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaCustomerRepository } from './prisma-customer.repository';

function buildRepository() {
  const findMany = jest.fn();
  const findUnique = jest.fn();
  const update = jest.fn();
  const repository = new PrismaCustomerRepository({
    customer: { findMany, findUnique, update },
  } as unknown as PrismaService);

  return { repository, findMany, findUnique, update };
}

describe('PrismaCustomerRepository', () => {
  it('lists customers with their address and sector', async () => {
    const { repository, findMany } = buildRepository();
    const customers = [{ id: 'customer-1' }];
    findMany.mockResolvedValue(customers);

    await expect(repository.findAll()).resolves.toBe(customers);
    expect(findMany).toHaveBeenCalledWith({
      where: { isDeleted: false },
      include: { address: true, sector: true },
    });
  });

  it('returns false when removing an unknown customer', async () => {
    const { repository, findUnique, update } = buildRepository();
    findUnique.mockResolvedValue(null);

    await expect(repository.remove('missing-id')).resolves.toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it('deactivates an existing customer', async () => {
    const { repository, findUnique, update } = buildRepository();
    findUnique.mockResolvedValue({ id: 'customer-1' });

    await expect(repository.remove('customer-1')).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'customer-1', isDeleted: false },
      select: { id: true },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'customer-1' },
      data: { isDeleted: true },
    });
  });
});
