import { NotFoundException } from '@nestjs/common';
import { RemoveCustomerUseCase } from '../application/remove-customer.use-case';
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
    const removeCustomerUseCase = {
      removeCustomer: jest.fn(),
    } as unknown as RemoveCustomerUseCase;
    const service = new CustomersService(
      listCustomersUseCase as unknown as ListCustomersUseCase,
      findCustomerUseCase,
      removeCustomerUseCase,
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
      {} as RemoveCustomerUseCase,
    );

    await expect(service.findOne('customer-1')).resolves.toEqual(customer);
    expect(findCustomer).toHaveBeenCalledWith('customer-1');
  });

  it('hides missing customers behind the contracted not found error', async () => {
    const findCustomer = jest.fn().mockResolvedValue(null);
    const service = new CustomersService(
      {} as ListCustomersUseCase,
      { findCustomer } as unknown as FindCustomerUseCase,
      {} as RemoveCustomerUseCase,
    );

    await expect(service.findOne('missing-id')).rejects.toThrow(
      'Empresa não encontrada',
    );
  });

  it('removes a customer through the remove use case', async () => {
    const removeCustomer = jest.fn().mockResolvedValue(true);
    const removeCustomerUseCase = {
      removeCustomer,
    } as unknown as RemoveCustomerUseCase;
    const service = new CustomersService(
      {} as ListCustomersUseCase,
      {} as FindCustomerUseCase,
      removeCustomerUseCase,
    );

    await expect(service.remove('customer-1')).resolves.toBe(true);
    expect(removeCustomer).toHaveBeenCalledWith('customer-1');
  });

  it('throws not found when the remove use case finds no customer', async () => {
    const removeCustomerUseCase = {
      removeCustomer: jest.fn().mockResolvedValue(false),
    } as unknown as RemoveCustomerUseCase;
    const service = new CustomersService(
      {} as ListCustomersUseCase,
      {} as FindCustomerUseCase,
      removeCustomerUseCase,
    );

    await expect(service.remove('missing-id')).rejects.toEqual(
      new NotFoundException('Empresa não encontrada'),
    );
  });
});
