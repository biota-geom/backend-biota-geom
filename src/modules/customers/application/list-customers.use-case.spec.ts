import { CustomerRepository } from '../domain/customers.repository';
import { ListCustomersUseCase } from './list-customers.use-case';

describe('ListCustomersUseCase', () => {
  it('maps all customer data and exposes status as text', async () => {
    const findAll = jest.fn().mockResolvedValue([
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
        name: 'Filial sem localização',
        isActive: true,
        address: null,
        sector: undefined,
      },
    ]);
    const repository = { findAll } as unknown as CustomerRepository;

    const useCase = new ListCustomersUseCase(repository);

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
      {
        id: 'customer-3',
        name: 'Filial sem localização',
        status: 'Ativo',
        segment: '',
        location: '',
      },
    ]);

    expect(findAll).toHaveBeenCalledTimes(1);
  });
});
