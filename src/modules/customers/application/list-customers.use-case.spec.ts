import { CustomerRepository } from '../domain/customers.repository';
import { ListCustomersUseCase } from './list-customers.use-case';

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
      ]),
    };

    const useCase = new ListCustomersUseCase(
      repository as unknown as CustomerRepository,
    );

    await expect(useCase.listCustomers()).resolves.toEqual([
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
    ]);

    expect(repository.findAll).toHaveBeenCalledTimes(1);
  });
});
