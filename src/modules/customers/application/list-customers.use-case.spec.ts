import { CustomerRepository } from '../domain/customers.repository';
import { InMemoryCustomerRepository } from './__tests__/in-memory-customer.repository';
import { ListCustomersUseCase } from './list-customers.use-case';

const OWNER = 'owner-1';
const OTHER_OWNER = 'owner-2';
const UPDATED_AT = new Date('2026-09-17T14:30:00.000Z');
const LIST_AGGREGATES = {
  document: '12345678000199',
  updatedAt: UPDATED_AT,
  totalLicenses: 10,
  regularLicenses: 7,
};
const LIST_RESPONSE_FIELDS = {
  document: '12345678000199',
  total_licenses: 10,
  updated_at: UPDATED_AT.toISOString(),
  conformity_percentage: 70,
};

describe('ListCustomersUseCase', () => {
  it('maps all customer data and exposes status as text', async () => {
    const repository: Pick<CustomerRepository, 'findAll'> = {
      findAll: jest.fn().mockResolvedValue([
        {
          ...LIST_AGGREGATES,
          id: 'customer-1',
          name: 'Unidade Industrial RS',
          isActive: true,
          address: { city: 'Porto Alegre', state: 'RS' },
          sector: { name: 'Siderurgia' },
        },
        {
          ...LIST_AGGREGATES,
          id: 'customer-2',
          name: 'Filial SP',
          isActive: false,
          address: { city: 'São Paulo', state: 'SP' },
          sector: null,
        },
        {
          ...LIST_AGGREGATES,
          id: 'customer-3',
          name: 'Filial sem endereço',
          isActive: true,
          address: undefined,
          sector: undefined,
        },
        {
          ...LIST_AGGREGATES,
          id: 'customer-4',
          name: 'Filial sem cidade',
          isActive: true,
          address: { city: '', state: 'SC' },
          sector: { name: 'Metalurgia' },
        },
        {
          ...LIST_AGGREGATES,
          id: 'customer-5',
          name: 'Filial sem estado',
          isActive: true,
          address: { city: 'Curitiba', state: '' },
          sector: { name: 'Serviços' },
        },
      ]),
    };

    const useCase = new ListCustomersUseCase(
      repository as unknown as CustomerRepository,
    );

    await expect(useCase.listCustomers(OWNER)).resolves.toEqual([
      {
        ...LIST_RESPONSE_FIELDS,
        id: 'customer-1',
        name: 'Unidade Industrial RS',
        status: 'Ativo',
        segment: 'Siderurgia',
        location: 'Porto Alegre - RS',
      },
      {
        ...LIST_RESPONSE_FIELDS,
        id: 'customer-2',
        name: 'Filial SP',
        status: 'Inativo',
        segment: '',
        location: 'São Paulo - SP',
      },
      {
        ...LIST_RESPONSE_FIELDS,
        id: 'customer-3',
        name: 'Filial sem endereço',
        status: 'Ativo',
        segment: '',
        location: '',
      },
      {
        ...LIST_RESPONSE_FIELDS,
        id: 'customer-4',
        name: 'Filial sem cidade',
        status: 'Ativo',
        segment: 'Metalurgia',
        location: 'SC',
      },
      {
        ...LIST_RESPONSE_FIELDS,
        id: 'customer-5',
        name: 'Filial sem estado',
        status: 'Ativo',
        segment: 'Serviços',
        location: 'Curitiba',
      },
    ]);

    expect(repository.findAll).toHaveBeenCalledTimes(1);
    expect(repository.findAll).toHaveBeenCalledWith(OWNER);
  });

  it('returns null conformity for a customer without licenses', async () => {
    const repository: Pick<CustomerRepository, 'findAll'> = {
      findAll: jest.fn().mockResolvedValue([
        {
          ...LIST_AGGREGATES,
          id: 'customer-1',
          name: 'Empresa sem licenças',
          isActive: true,
          totalLicenses: 0,
          regularLicenses: 0,
          address: null,
          sector: null,
        },
      ]),
    };
    const useCase = new ListCustomersUseCase(
      repository as unknown as CustomerRepository,
    );

    const [customer] = await useCase.listCustomers(OWNER);

    expect(customer.conformity_percentage).toBeNull();
    expect(customer.total_licenses).toBe(0);
  });

  // US03: the list shows the authenticated client's companies and nothing else.
  it('returns only the companies of the authenticated owner', async () => {
    const repository = new InMemoryCustomerRepository();
    repository.add({ ownerUserId: OWNER, name: 'Minha Empresa' });
    repository.add({ ownerUserId: OTHER_OWNER, name: 'Empresa Alheia' });
    const useCase = new ListCustomersUseCase(repository);

    const mine = await useCase.listCustomers(OWNER);
    const theirs = await useCase.listCustomers(OTHER_OWNER);

    expect(mine.map((customer) => customer.name)).toEqual(['Minha Empresa']);
    expect(theirs.map((customer) => customer.name)).toEqual(['Empresa Alheia']);
  });

  it('returns an empty list for an owner with no companies', async () => {
    const repository = new InMemoryCustomerRepository();
    repository.add({ ownerUserId: OTHER_OWNER });
    const useCase = new ListCustomersUseCase(repository);

    await expect(useCase.listCustomers('brand-new-account')).resolves.toEqual(
      [],
    );
  });
});
