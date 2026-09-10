import { CustomerRepository } from '../domain/customers.repository';
import { FindCustomerUseCase } from './find-a-customer.use-case';

describe('FindCustomerUseCase', () => {
  it('maps the customer details for the dashboard header', async () => {
    const findOne = jest.fn().mockResolvedValue({
      id: 'customer-1',
      name: 'Unidade Industrial RS',
      document: '12345678000199',
      documentType: 'cnpj',
      isActive: true,
      sector: { id: 'sector-1', name: 'Siderurgia' },
      address: { city: 'Porto Alegre', state: 'RS' },
    });
    const useCase = new FindCustomerUseCase({
      findOne,
    } as unknown as CustomerRepository);

    await expect(useCase.findCustomer('customer-1')).resolves.toEqual({
      id: 'customer-1',
      name: 'Unidade Industrial RS',
      document: '12345678000199',
      document_type: 'cnpj',
      status: 'active',
      sector: { id: 'sector-1', name: 'Siderurgia' },
      address: { city: 'Porto Alegre', state: 'RS' },
    });
    expect(findOne).toHaveBeenCalledWith('customer-1');
  });

  it('returns null when the customer is not found', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const useCase = new FindCustomerUseCase({
      findOne,
    } as unknown as CustomerRepository);

    await expect(useCase.findCustomer('missing-id')).resolves.toBeNull();
  });
});
