import { CustomerRepository } from '../domain/customers.repository';
import { InMemoryCustomerRepository } from './__tests__/in-memory-customer.repository';
import { ListCustomersUseCase } from './list-customers.use-case';

const OWNER = 'owner-1';
const OTHER_OWNER = 'owner-2';

describe('ListCustomersUseCase', () => {
  it('maps all customer data and exposes status as text', async () => {
    const repository: Pick<CustomerRepository, 'findAll'> = {
      findAll: jest.fn().mockResolvedValue([
        {
          id: 'customer-1',
          name: 'Unidade Industrial RS',
          isActive: true,
          address: { city: 'Porto Alegre', state: 'RS' },
          sector: { name: 'Siderurgia' },
        },
        {
          id: 'customer-2',
          name: 'Filial SP',
          isActive: false,
          address: { city: 'São Paulo', state: 'SP' },
          sector: null,
        },
        {
          id: 'customer-3',
          name: 'Filial sem endereço',
          isActive: true,
          address: undefined,
          sector: undefined,
        },
        {
          id: 'customer-4',
          name: 'Filial sem cidade',
          isActive: true,
          address: { city: '', state: 'SC' },
          sector: { name: 'Metalurgia' },
        },
        {
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
        id: 'customer-1',
        name: 'Unidade Industrial RS',
        status: 'Ativo',
        segment: 'Siderurgia',
        location: 'Porto Alegre - RS',
      },
      {
        id: 'customer-2',
        name: 'Filial SP',
        status: 'Inativo',
        segment: '',
        location: 'São Paulo - SP',
      },
      {
        id: 'customer-3',
        name: 'Filial sem endereço',
        status: 'Ativo',
        segment: '',
        location: '',
      },
      {
        id: 'customer-4',
        name: 'Filial sem cidade',
        status: 'Ativo',
        segment: 'Metalurgia',
        location: 'SC',
      },
      {
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
