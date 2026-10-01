import { LicenseConditionStatus } from '@prisma/client';
import { GetLicenseConditionsComplianceUseCase } from '../../licenses/application/get-license-conditions-compliance.use-case';
import { LicenseConditionRepository } from '../../licenses/domain/license-conditions.repository';
import { CustomerRepository } from '../domain/customers.repository';
import { InMemoryCustomerRepository } from './__tests__/in-memory-customer.repository';
import { ListCustomersUseCase } from './list-customers.use-case';

const OWNER = 'owner-1';
const OTHER_OWNER = 'owner-2';
const NOW = new Date('2026-09-17T14:30:00.000Z');
const UPDATED_AT = new Date('2026-09-17T14:30:00.000Z');
const REGULAR_EXPIRATION = new Date('2026-11-01T14:30:00.000Z');
const ATTENTION_EXPIRATION = new Date('2026-10-01T14:30:00.000Z');
const REGULAR_DUE_DATE = new Date('2026-11-01T14:30:00.000Z');
const ATTENTION_DUE_DATE = new Date('2026-10-01T14:30:00.000Z');
const LIST_AGGREGATES = {
  document: '12345678000199',
  updatedAt: UPDATED_AT,
  totalLicenses: 10,
  licenseExpirationDates: [
    ...Array<Date>(7).fill(REGULAR_EXPIRATION),
    ...Array<Date>(3).fill(ATTENTION_EXPIRATION),
  ],
  licenseConditionDueDates: [
    ...Array<Date>(7).fill(REGULAR_DUE_DATE),
    ...Array<Date>(3).fill(ATTENTION_DUE_DATE),
  ],
};
const LIST_RESPONSE_FIELDS = {
  document: '12345678000199',
  total_licenses: 10,
  updated_at: UPDATED_AT.toISOString(),
  conformity_percentage: 70,
  attention_count: 3,
  expired_count: 0,
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
          licenseConditionDueDates: [],
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
          licenseConditionDueDates: [REGULAR_DUE_DATE],
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
          licenseConditionDueDates: [
            REGULAR_DUE_DATE,
            REGULAR_DUE_DATE,
            ATTENTION_DUE_DATE,
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
          licenseConditionDueDates: [REGULAR_DUE_DATE, ATTENTION_DUE_DATE],
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
        conformity_percentage: 100,
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

  it('counts expired and attention licenses from their expiration dates', async () => {
    const repository: Pick<CustomerRepository, 'findAll'> = {
      findAll: jest.fn().mockResolvedValue([
        {
          ...LIST_AGGREGATES,
          id: 'customer-1',
          name: 'Empresa com licenças críticas',
          isActive: true,
          totalLicenses: 2,
          licenseExpirationDates: [
            new Date('2026-09-16T14:30:00.000Z'),
            new Date('2026-10-02T14:30:00.000Z'),
          ],
          address: null,
          sector: null,
        },
      ]),
    };
    const useCase = new ListCustomersUseCase(
      repository as unknown as CustomerRepository,
    );

    const [customer] = await useCase.listCustomers(OWNER, NOW);

    expect(customer.expired_count).toBe(1);
    expect(customer.attention_count).toBe(1);
  });

  it('returns 100% conformity for a customer without conditions', async () => {
    const repository: Pick<CustomerRepository, 'findAll'> = {
      findAll: jest.fn().mockResolvedValue([
        {
          ...LIST_AGGREGATES,
          id: 'customer-1',
          name: 'Empresa sem condicionantes',
          isActive: true,
          totalLicenses: 0,
          licenseConditionDueDates: [],
          address: null,
          sector: null,
        },
      ]),
    };
    const useCase = new ListCustomersUseCase(
      repository as unknown as CustomerRepository,
    );

    const [customer] = await useCase.listCustomers(OWNER, NOW);

    expect(customer.conformity_percentage).toBe(100);
    expect(customer.total_licenses).toBe(0);
  });

  it('does not count an overdue condition as compliant', async () => {
    const repository: Pick<CustomerRepository, 'findAll'> = {
      findAll: jest.fn().mockResolvedValue([
        {
          ...LIST_AGGREGATES,
          id: 'customer-1',
          name: 'Empresa com condicionante vencida',
          isActive: true,
          totalLicenses: 1,
          licenseConditionDueDates: [new Date('2026-09-16T14:30:00.000Z')],
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

  // US21: the company card and the monitor progress bar must never disagree.
  it('matches the compliance percentage of the license conditions monitor', async () => {
    const dueDates = [
      ...Array<Date>(4).fill(REGULAR_DUE_DATE),
      ...Array<Date>(2).fill(ATTENTION_DUE_DATE),
      ...Array<Date>(2).fill(new Date('2026-09-16T14:30:00.000Z')),
    ];
    const customerRepository = {
      findAll: jest.fn().mockResolvedValue([
        {
          ...LIST_AGGREGATES,
          id: 'customer-1',
          name: 'Empresa monitorada',
          isActive: true,
          totalLicenses: 2,
          licenseConditionDueDates: dueDates,
          address: null,
          sector: null,
        },
      ]),
      findOne: jest.fn().mockResolvedValue({ id: 'customer-1' }),
    };
    const licenseConditionRepository = {
      findAllByCustomerId: jest.fn().mockResolvedValue(
        dueDates.map((dueDate, index) => ({
          id: `condition-${index}`,
          licenseId: 'license-1',
          name: `Condicionante ${index}`,
          description: null,
          category: { id: 'metric-emissoes', name: 'Emissões' },
          responsibleAgency: null,
          dueDate,
          status: LicenseConditionStatus.REGULAR,
          targetMetricId: null,
          targetOperator: null,
          targetValue: null,
          createdAt: NOW,
          updatedAt: NOW,
        })),
      ),
    };
    const listCustomers = new ListCustomersUseCase(
      customerRepository as unknown as CustomerRepository,
    );
    const getCompliance = new GetLicenseConditionsComplianceUseCase(
      licenseConditionRepository as unknown as LicenseConditionRepository,
      customerRepository as unknown as CustomerRepository,
    );

    const [customer] = await listCustomers.listCustomers(OWNER, NOW);
    const compliance = await getCompliance.execute('customer-1', OWNER, NOW);

    expect(compliance.compliancePercentage).toBe(50);
    expect(customer.conformity_percentage).toBe(
      compliance.compliancePercentage,
    );
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
