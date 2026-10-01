import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaCustomerRepository } from './prisma-customer.repository';

const OWNER = 'owner-1';

function buildRepository() {
  const findMany = jest.fn();
  const findUnique = jest.fn();
  const update = jest.fn<
    Promise<unknown>,
    [
      {
        where: { id: string };
        data: Record<string, unknown>;
      },
    ]
  >();

  const repository = new PrismaCustomerRepository({
    customer: { findMany, findUnique, update },
  } as unknown as PrismaService);

  return { repository, findMany, findUnique, update };
}

describe('PrismaCustomerRepository', () => {
  it('lists customers with license totals and condition due dates', async () => {
    const { repository, findMany } = buildRepository();
    const dueDates = Array.from(
      { length: 3 },
      (_, index) => new Date(`2027-01-${String(index + 1).padStart(2, '0')}`),
    );
    const customers = [
      {
        id: 'customer-1',
        _count: { licenses: 2 },
        // Conditions of every license are flattened into one list.
        licenses: [
          { conditions: [{ dueDate: dueDates[0] }, { dueDate: dueDates[1] }] },
          { conditions: [{ dueDate: dueDates[2] }] },
        ],
      },
    ];
    findMany.mockResolvedValue(customers);

    await expect(repository.findAll(OWNER)).resolves.toEqual([
      {
        id: 'customer-1',
        totalLicenses: 2,
        licenseConditionDueDates: dueDates,
      },
    ]);
    // Scoped in the query itself: there is no unfiltered read to fall back to.
    expect(findMany).toHaveBeenCalledWith({
      where: { ownerUserId: OWNER, isDeleted: false },
      include: {
        address: true,
        sector: true,
        _count: { select: { licenses: true } },
        licenses: {
          select: { conditions: { select: { dueDate: true } } },
        },
      },
    });
  });

  it('returns false when removing an unknown customer', async () => {
    const { repository, findUnique, update } = buildRepository();
    findUnique.mockResolvedValue(null);

    await expect(repository.remove('missing-id', OWNER)).resolves.toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it('deactivates an existing customer', async () => {
    const { repository, findUnique, update } = buildRepository();
    findUnique.mockResolvedValue({ id: 'customer-1' });

    await expect(repository.remove('customer-1', OWNER)).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'customer-1', ownerUserId: OWNER, isDeleted: false },
      select: { id: true },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'customer-1' },
      data: { isDeleted: true },
    });
  });

  it('removes a customer that is inactive but not deleted, without touching isActive', async () => {
    const { repository, findUnique, update } = buildRepository();
    findUnique.mockResolvedValue({ id: 'customer-1', isActive: false });

    await expect(repository.remove('customer-1', OWNER)).resolves.toBe(true);

    expect(update).toHaveBeenCalledWith({
      where: { id: 'customer-1' },
      data: { isDeleted: true },
    });
  });

  it('returns false when the customer is already deleted', async () => {
    const { repository, findUnique, update } = buildRepository();

    // An already-deleted customer does not match the isDeleted: false filter,
    // so it is treated the same as a non-existent customer (404). A customer
    // of another owner falls out of the same query for the same reason.
    findUnique.mockResolvedValue(null);

    await expect(repository.remove('customer-1', OWNER)).resolves.toBe(false);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'customer-1', ownerUserId: OWNER, isDeleted: false },
      select: { id: true },
    });
    expect(update).not.toHaveBeenCalled();
  });
});
