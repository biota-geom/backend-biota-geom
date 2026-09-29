import { CustomerRepository } from '../domain/customers.repository';
import { InMemoryCustomerRepository } from './__tests__/in-memory-customer.repository';
import { ListCustomersUseCase } from './list-customers.use-case';

const OWNER = 'owner-1';
const OTHER_OWNER = 'owner-2';
const NOW = new Date('2026-09-17T14:30:00.000Z');
const UPDATED_AT = new Date('2026-09-17T14:30:00.000Z');
const REGULAR_EXPIRATION = new Date('2026-11-01T14:30:00.000Z');
const ATTENTION_EXPIRATION = new Date('2026-10-01T14:30:00.000Z');
const LIST_AGGREGATES = {
  document: '12345678000199',
  updatedAt: UPDATED_AT,
  totalLicenses: 10,
  licenseExpirationDates: [
    ...Array<Date>(7).fill(REGULAR_EXPIRATION),
    ...Array<Date>(3).fill(ATTENTION_EXPIRATION),
  ],
};
const LIST_RESPONSE_FIELDS = {
  document: '12345678000199',
  total_licenses: 10,
  updated_at: UPDATED_AT.toISOString(),
  conformity_percentage: 70,
};

describe('ListCustomersUseCase', () => {
  it('maps all customer data, license count and last update', async () => {
    const repository: Pick<CustomerRepository, 'findAll'> = {
      findAll: jest.fn().mockResolvedValue([
        {
          ...LIST_AGGREGATES,
          id: 'customer-1',
          updatedAt: new Date('2026-09-17T14:30:00.000Z'),
          name: 'Unidade Industrial RS',
          isActive: true,
          address: { city: 'Porto Alegre', state: 'RS' },
          sector: { name: 'Siderurgia' },
        },
        {
          ...LIST_AGGREGATES,
          id: 'customer-2',
          totalLicenses: 0,
          licenseExpirationDates: [],
          updatedAt: new Date('2026-09-10T08:00:00.000Z'),
          name: 'Filial SP',
          isActive: false,
          address: { city: 'São Paulo', state: 'SP' },
          sector: null,
        },
        {
          ...LIST_AGGREGATES,
          id: 'customer-3',
          totalLicenses: 1,
          licenseExpirationDates: [REGULAR_EXPIRATION],
          updatedAt: new Date('2026-08-01T00:00:00.000Z'),
          name: 'Filial sem endereço',
          isActive: true,
          address: undefined,
          sector: undefined,
        },
        {
          ...LIST_AGGREGATES,
          id: 'customer-4',
          totalLicenses: 3,
          licenseExpirationDates: [
            REGULAR_EXPIRATION,
            REGULAR_EXPIRATION,
            ATTENTION_EXPIRATION,
          ],
          updatedAt: new Date('2026-07-15T12:00:00.000Z'),
          name: 'Filial sem cidade',
          isActive: true,
          address: { city: '', state: 'SC' },
          sector: { name: 'Metalurgia' },
        },
        {
          ...LIST_AGGREGATES,
          id: 'customer-5',
          totalLicenses: 2,
          licenseExpirationDates: [REGULAR_EXPIRATION, ATTENTION_EXPIRATION],
          updatedAt: new Date('2026-06-30T23:59:59.000Z'),
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

    await expect(useCase.listCustomers(OWNER, NOW)).resolves.toEqual([
      {
        ...LIST_RESPONSE_FIELDS,
        id: 'customer-1',
        updated_at: '2026-09-17T14:30:00.000Z',
        name: 'Unidade Industrial RS',
        status: 'Ativo',
        segment: 'Siderurgia',
        location: 'Porto Alegre - RS',
      },
      {
        ...LIST_RESPONSE_FIELDS,
        id: 'customer-2',
        total_licenses: 0,
        updated_at: '2026-09-10T08:00:00.000Z',
        conformity_percentage: null,
        name: 'Filial SP',
        status: 'Inativo',
        segment: '',
        location: 'São Paulo - SP',
      },
      {
        ...LIST_RESPONSE_FIELDS,
        id: 'customer-3',
        total_licenses: 1,
        updated_at: '2026-08-01T00:00:00.000Z',
        conformity_percentage: 100,
        name: 'Filial sem endereço',
        status: 'Ativo',
        segment: '',
        location: '',
      },
      {
        ...LIST_RESPONSE_FIELDS,
        id: 'customer-4',
        total_licenses: 3,
        updated_at: '2026-07-15T12:00:00.000Z',
        conformity_percentage: 67,
        name: 'Filial sem cidade',
        status: 'Ativo',
        segment: 'Metalurgia',
        location: 'SC',
      },
      {
        ...LIST_RESPONSE_FIELDS,
        id: 'customer-5',
        total_licenses: 2,
        updated_at: '2026-06-30T23:59:59.000Z',
        conformity_percentage: 50,
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
          licenseExpirationDates: [],
          address: null,
          sector: null,
        },
      ]),
    };
    const useCase = new ListCustomersUseCase(
      repository as unknown as CustomerRepository,
    );

    const [customer] = await useCase.listCustomers(OWNER, NOW);

    expect(customer.conformity_percentage).toBeNull();
    expect(customer.total_licenses).toBe(0);
  });

  it('does not count a license whose persisted status became stale after expiration', async () => {
    const repository: Pick<CustomerRepository, 'findAll'> = {
      findAll: jest.fn().mockResolvedValue([
        {
          ...LIST_AGGREGATES,
          id: 'customer-1',
          name: 'Empresa com licença vencida',
          isActive: true,
          totalLicenses: 1,
          licenseExpirationDates: [new Date('2026-09-16T14:30:00.000Z')],
          address: null,
          sector: null,
        },
      ]),
    };
    const useCase = new ListCustomersUseCase(
      repository as unknown as CustomerRepository,
    );

    const [customer] = await useCase.listCustomers(OWNER, NOW);

    expect(customer.conformity_percentage).toBe(0);
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
