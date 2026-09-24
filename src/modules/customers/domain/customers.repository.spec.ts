import { LicenseStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CustomerAddressNotFoundError } from './errors/customer-address-not-found.error';
import { PrismaCustomerRepository } from '../infra/prisma-customer.repository';

const OWNER = 'owner-1';

const CUSTOMER_ROW = {
  id: 'customer-1',
  ownerUserId: OWNER,
  name: 'Unidade Industrial RS',
  document: '12345678000199',
  documentType: 'cnpj',
  email: 'contato@empresa.com',
  ownerName: 'Responsável',
  ownerEmail: 'responsavel@empresa.com',
  ownerPhone: '+55 51 90000-0000',
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  addressId: 'address-1',
  address: {
    id: 'address-1',
    type: 'billing',
    street: 'Avenida das Palmeiras',
    number: '1000',
    city: 'Porto Alegre',
    state: 'RS',
    postalCode: '90000-000',
    countryCode: 'BR',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  sectorId: 'sector-1',
  sector: { id: 'sector-1', name: 'Siderurgia' },
};

function buildRepository() {
  const findUnique = jest.fn();
  const findUniqueOrThrow = jest.fn();
  const update = jest.fn();
  const customerAddressUpdate = jest.fn();

  const tx = {
    customer: { findUniqueOrThrow, update },
    customerAddress: { update: customerAddressUpdate },
  };

  const prisma = {
    customer: { findUnique },
    $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(tx)),
  } as unknown as PrismaService;

  const repository = new PrismaCustomerRepository(prisma);

  return {
    repository,
    findUnique,
    findUniqueOrThrow,
    update,
    customerAddressUpdate,
  };
}

describe('PrismaCustomerRepository', () => {
  it('loads active customers with their nested address and sector', async () => {
    const customer = {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'customer-1',
          _count: { licenses: 3 },
          licenses: [{ id: 'license-1' }, { id: 'license-2' }],
        },
      ]),
    };
    const prisma = { customer } as unknown as PrismaService;
    const repository = new PrismaCustomerRepository(prisma);

    await expect(repository.findAll(OWNER)).resolves.toEqual([
      {
        id: 'customer-1',
        totalLicenses: 3,
        regularLicenses: 2,
      },
    ]);
    expect(customer.findMany).toHaveBeenCalledWith({
      where: { ownerUserId: OWNER, isDeleted: false },
      include: {
        address: true,
        sector: true,
        _count: { select: { licenses: true } },
        licenses: {
          where: { status: LicenseStatus.REGULAR },
          select: { id: true },
        },
      },
    });
  });

  describe('findById', () => {
    it('loads a customer with its address and sector', async () => {
      const { repository, findUnique } = buildRepository();
      findUnique.mockResolvedValue(CUSTOMER_ROW);

      await expect(repository.findById('customer-1', OWNER)).resolves.toEqual(
        expect.objectContaining({ id: 'customer-1' }),
      );
      expect(findUnique).toHaveBeenCalledWith({
        where: { id: 'customer-1', ownerUserId: OWNER },
        include: { address: true, sector: true },
      });
    });

    it('returns null when the customer does not exist', async () => {
      const { repository, findUnique } = buildRepository();
      findUnique.mockResolvedValue(null);

      await expect(
        repository.findById('missing-id', OWNER),
      ).resolves.toBeNull();
    });
  });

  describe('update', () => {
    it('updates the provided customer fields in a transaction', async () => {
      const { repository, findUniqueOrThrow, update } = buildRepository();
      findUniqueOrThrow
        .mockResolvedValueOnce({ ...CUSTOMER_ROW, addressId: 'address-1' })
        .mockResolvedValueOnce(CUSTOMER_ROW);

      const result = await repository.update('customer-1', OWNER, {
        name: 'Empresa Atualizada',
      });

      // The write itself is owner-scoped, not just the lookup that precedes it.
      expect(findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'customer-1', ownerUserId: OWNER },
      });
      expect(update).toHaveBeenCalledWith({
        where: { id: 'customer-1', ownerUserId: OWNER },
        data: { name: 'Empresa Atualizada' },
      });
      expect(result).toEqual(expect.objectContaining({ id: 'customer-1' }));
    });

    it('updates only the provided address fields when the customer already has an address', async () => {
      const { repository, findUniqueOrThrow, customerAddressUpdate } =
        buildRepository();
      findUniqueOrThrow
        .mockResolvedValueOnce({ ...CUSTOMER_ROW, addressId: 'address-1' })
        .mockResolvedValueOnce(CUSTOMER_ROW);

      await repository.update('customer-1', OWNER, {
        address: { city: 'Canoas', state: 'RS' },
      });

      expect(customerAddressUpdate).toHaveBeenCalledWith({
        where: { id: 'address-1' },
        data: { city: 'Canoas', state: 'RS' },
      });
    });

    it('throws CustomerAddressNotFoundError when trying to update an address the customer does not have', async () => {
      const { repository, findUniqueOrThrow } = buildRepository();
      findUniqueOrThrow.mockResolvedValueOnce({
        ...CUSTOMER_ROW,
        addressId: null,
      });

      await expect(
        repository.update('customer-1', OWNER, {
          address: { city: 'Canoas' },
        }),
      ).rejects.toThrow(CustomerAddressNotFoundError);
    });
  });

  it('finds one customer by id with its address and sector', async () => {
    const findOne = jest.fn().mockResolvedValue({ id: 'customer-1' });
    const customer = { findMany: jest.fn(), findUnique: findOne };
    const repository = new PrismaCustomerRepository({
      customer,
    } as unknown as PrismaService);

    await expect(repository.findOne('customer-1', OWNER)).resolves.toEqual({
      id: 'customer-1',
    });
    expect(findOne).toHaveBeenCalledWith({
      where: { id: 'customer-1', ownerUserId: OWNER, isDeleted: false },
      include: { address: true, sector: true },
    });
  });

  /*
   * A customer of another owner does not match the ownerUserId filter, so the
   * query returns nothing — the caller cannot tell it apart from an id that
   * was never issued, which is what keeps the response a 404 instead of a 403.
   */
  it('filters a foreign customer out of the scoped lookup', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const customer = { findMany: jest.fn(), findUnique: findOne };
    const repository = new PrismaCustomerRepository({
      customer,
    } as unknown as PrismaService);

    await expect(
      repository.findOne('customer-of-another-owner', OWNER),
    ).resolves.toBeNull();
    expect(findOne).toHaveBeenCalledWith({
      where: {
        id: 'customer-of-another-owner',
        ownerUserId: OWNER,
        isDeleted: false,
      },
      include: { address: true, sector: true },
    });
  });

  it('returns null when the requested customer does not exist', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const customer = { findMany: jest.fn(), findUnique: findOne };
    const repository = new PrismaCustomerRepository({
      customer,
    } as unknown as PrismaService);

    await expect(repository.findOne('missing-id', OWNER)).resolves.toBeNull();
  });

  it('returns null when the requested customer is deleted', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const customer = { findMany: jest.fn(), findUnique: findOne };
    const repository = new PrismaCustomerRepository({
      customer,
    } as unknown as PrismaService);

    await expect(repository.findOne('deleted-id', OWNER)).resolves.toBeNull();
    expect(findOne).toHaveBeenCalledWith({
      where: { id: 'deleted-id', ownerUserId: OWNER, isDeleted: false },
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

    await expect(repository.remove('customer-1', OWNER)).resolves.toBe(true);
    expect(customer.findUnique).toHaveBeenCalledWith({
      where: { id: 'customer-1', ownerUserId: OWNER, isDeleted: false },
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

    await expect(repository.remove('missing-id', OWNER)).resolves.toBe(false);
    expect(customer.update).not.toHaveBeenCalled();
  });
});
