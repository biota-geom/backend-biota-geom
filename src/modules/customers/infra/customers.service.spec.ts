import { ListCustomersUseCase } from '../application/list-customers.use-case';
import { FindCustomerUseCase } from '../application/find-a-customer.use-case';
import { CustomersService } from './customers.service';

describe('CustomersService', () => {
  it('delegates the list operation to the use case', async () => {
    const result = [{ id: 'customer-1', name: 'Unidade Industrial RS' }];
    const listCustomersUseCase: Pick<ListCustomersUseCase, 'listCustomers'> = {
      listCustomers: jest.fn().mockResolvedValue(result),
    };
    const findCustomerUseCase = {} as FindCustomerUseCase;
    const service = new CustomersService(
      listCustomersUseCase as unknown as ListCustomersUseCase,
      findCustomerUseCase,
    );

    await expect(service.findAll()).resolves.toEqual(result);
    expect(listCustomersUseCase.listCustomers).toHaveBeenCalledTimes(1);
  });

  it('returns the customer details from the find use case', async () => {
    const customer = { id: 'customer-1', name: 'Unidade Industrial RS' };
    const findCustomer = jest.fn().mockResolvedValue(customer);
    const service = new CustomersService(
      {} as ListCustomersUseCase,
      { findCustomer } as unknown as FindCustomerUseCase,
    );

    await expect(service.findOne('customer-1')).resolves.toEqual(customer);
    expect(findCustomer).toHaveBeenCalledWith('customer-1');
  });

  it('hides missing customers behind the contracted not found error', async () => {
    const findCustomer = jest.fn().mockResolvedValue(null);
    const service = new CustomersService(
      {} as ListCustomersUseCase,
      { findCustomer } as unknown as FindCustomerUseCase,
    );

    await expect(service.findOne('missing-id')).rejects.toThrow(
      'Empresa não encontrada ou acesso negado',
    );
  });
});
