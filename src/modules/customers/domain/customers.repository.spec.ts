import { PrismaService } from '../../../prisma/prisma.service';
import { CustomerAddressNotFoundError } from './errors/customer-address-not-found.error';
import { PrismaCustomerRepository } from '../infra/prisma-customer.repository';

const CUSTOMER_ROW = {
  id: 'customer-1',
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
  environmentalTopics: [
    { customerId: 'customer-1', esgMetricId: 'metric-1' },
    { customerId: 'customer-1', esgMetricId: 'metric-2' },
  ],
};

function buildRepository() {
  const findUnique = jest.fn();
  const findUniqueOrThrow = jest.fn();
  const update = jest.fn();
  const customerAddressUpdate = jest.fn();
  const deleteMany = jest.fn();
  const createMany = jest.fn();

  const tx = {
    customer: { findUniqueOrThrow, update },
    customerAddress: { update: customerAddressUpdate },
    customerEnvironmentalTopic: { deleteMany, createMany },
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
    deleteMany,
    createMany,
  };
}

describe('PrismaCustomerRepository', () => {
  it('loads all customers with their nested address and sector', async () => {
    const customer = {
      findMany: jest.fn().mockResolvedValue([{ id: 'customer-1' }]),
    };
    const prisma = { customer } as unknown as PrismaService;
    const repository = new PrismaCustomerRepository(prisma);

    await expect(repository.findAll()).resolves.toEqual([{ id: 'customer-1' }]);
    expect(customer.findMany).toHaveBeenCalledWith({
      include: {
        address: true,
        sector: true,
      },
    });
  });

  describe('findById', () => {
    it('maps a customer including its linked ESG indicator ids', async () => {
      const { repository, findUnique } = buildRepository();
      findUnique.mockResolvedValue(CUSTOMER_ROW);

      await expect(repository.findById('customer-1')).resolves.toEqual(
        expect.objectContaining({
          id: 'customer-1',
          esgIndicatorIds: ['metric-1', 'metric-2'],
        }),
      );
    });

    it('returns null when the customer does not exist', async () => {
      const { repository, findUnique } = buildRepository();
      findUnique.mockResolvedValue(null);

      await expect(repository.findById('missing-id')).resolves.toBeNull();
    });
  });

  describe('update', () => {
    it('updates customer fields and replaces the ESG indicator links in a transaction', async () => {
      const { repository, findUniqueOrThrow, update, deleteMany, createMany } =
        buildRepository();
      findUniqueOrThrow
        .mockResolvedValueOnce({ ...CUSTOMER_ROW, addressId: 'address-1' })
        .mockResolvedValueOnce(CUSTOMER_ROW);

      const result = await repository.update('customer-1', {
        name: 'Empresa Atualizada',
        esgIndicatorIds: ['metric-1', 'metric-2'],
      });

      expect(update).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
        data: { name: 'Empresa Atualizada' },
      });
      expect(deleteMany).toHaveBeenCalledWith({
        where: { customerId: 'customer-1' },
      });
      expect(createMany).toHaveBeenCalledWith({
        data: [
          { customerId: 'customer-1', esgMetricId: 'metric-1' },
          { customerId: 'customer-1', esgMetricId: 'metric-2' },
        ],
      });
      expect(result.esgIndicatorIds).toEqual(['metric-1', 'metric-2']);
    });

    it('does not recreate indicator links when the list is empty', async () => {
      const { repository, findUniqueOrThrow, deleteMany, createMany } =
        buildRepository();
      findUniqueOrThrow
        .mockResolvedValueOnce({ ...CUSTOMER_ROW, addressId: 'address-1' })
        .mockResolvedValueOnce({ ...CUSTOMER_ROW, environmentalTopics: [] });

      await repository.update('customer-1', { esgIndicatorIds: [] });

      expect(deleteMany).toHaveBeenCalledWith({
        where: { customerId: 'customer-1' },
      });
      expect(createMany).not.toHaveBeenCalled();
    });

    it('updates only the provided address fields when the customer already has an address', async () => {
      const { repository, findUniqueOrThrow, customerAddressUpdate } =
        buildRepository();
      findUniqueOrThrow
        .mockResolvedValueOnce({ ...CUSTOMER_ROW, addressId: 'address-1' })
        .mockResolvedValueOnce(CUSTOMER_ROW);

      await repository.update('customer-1', {
        address: { city: 'Canoas', state: 'RS' },
        esgIndicatorIds: [],
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
        repository.update('customer-1', {
          address: { city: 'Canoas' },
          esgIndicatorIds: [],
        }),
      ).rejects.toThrow(CustomerAddressNotFoundError);
    });
  });
});
