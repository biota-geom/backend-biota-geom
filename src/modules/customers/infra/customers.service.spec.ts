import { NotFoundException } from '@nestjs/common';
import { AddressType, DocumentType } from '@prisma/client';
import { CreateCustomerUseCase } from '../application/create-customer.use-case';
import { FindCustomerUseCase } from '../application/find-a-customer.use-case';
import { ListCustomersUseCase } from '../application/list-customers.use-case';
import { RemoveCustomerUseCase } from '../application/remove-customer.use-case';
import { CreateCustomerData } from '../domain/create-customer.data';
import { CustomersService } from './customers.service';

function buildService(overrides: {
  listCustomers?: jest.Mock;
  createCustomer?: jest.Mock;
  findCustomer?: jest.Mock;
  removeCustomer?: jest.Mock;
}): CustomersService {
  const listCustomersUseCase = {
    listCustomers: overrides.listCustomers ?? jest.fn(),
  };
  const createCustomerUseCase = {
    createCustomer: overrides.createCustomer ?? jest.fn(),
  };
  const findCustomerUseCase = {
    findCustomer: overrides.findCustomer ?? jest.fn(),
  };
  const removeCustomerUseCase = {
    removeCustomer: overrides.removeCustomer ?? jest.fn(),
  };

  return new CustomersService(
    listCustomersUseCase as unknown as ListCustomersUseCase,
    createCustomerUseCase as unknown as CreateCustomerUseCase,
    findCustomerUseCase as unknown as FindCustomerUseCase,
    removeCustomerUseCase as unknown as RemoveCustomerUseCase,
  );
}

describe('CustomersService', () => {
  it('delegates the list operation to the use case', async () => {
    const result = [{ id: 'customer-1', name: 'Unidade Industrial RS' }];
    const listCustomers = jest.fn().mockResolvedValue(result);

    await expect(buildService({ listCustomers }).findAll()).resolves.toEqual(
      result,
    );
    expect(listCustomers).toHaveBeenCalledTimes(1);
  });

  it('delegates the create operation to the use case', async () => {
    const created = { id: 'customer-1' };
    const createCustomer = jest.fn().mockResolvedValue(created);
    const data: CreateCustomerData = {
      name: 'Unidade Industrial RS',
      document: '12345678000199',
      documentType: DocumentType.CNPJ,
      sectorId: 'sector-1',
      email: 'contato@unidade.com.br',
      ownerName: 'Ana Silva',
      ownerEmail: 'ana.silva@unidade.com.br',
      ownerPhone: '+55 51 99999-0000',
      address: {
        type: AddressType.BILLING,
        street: 'Av. Assis Brasil',
        number: '123',
        city: 'Porto Alegre',
        state: 'RS',
        postalCode: '91010-000',
        countryCode: 'BR',
      },
    };

    await expect(buildService({ createCustomer }).create(data)).resolves.toBe(
      created,
    );
    expect(createCustomer).toHaveBeenCalledWith(data);
  });

  it('returns the customer details from the find use case', async () => {
    const customer = { id: 'customer-1', name: 'Unidade Industrial RS' };
    const findCustomer = jest.fn().mockResolvedValue(customer);

    await expect(
      buildService({ findCustomer }).findOne('customer-1'),
    ).resolves.toEqual(customer);
    expect(findCustomer).toHaveBeenCalledWith('customer-1');
  });

  it('hides missing customers behind the contracted not found error', async () => {
    const findCustomer = jest.fn().mockResolvedValue(null);

    await expect(
      buildService({ findCustomer }).findOne('missing-id'),
    ).rejects.toThrow('Empresa não encontrada');
  });

  it('removes a customer through the remove use case', async () => {
    const removeCustomer = jest.fn().mockResolvedValue(true);

    await expect(
      buildService({ removeCustomer }).remove('customer-1'),
    ).resolves.toBe(true);
    expect(removeCustomer).toHaveBeenCalledWith('customer-1');
  });

  it('throws not found when the remove use case finds no customer', async () => {
    const removeCustomer = jest.fn().mockResolvedValue(false);

    await expect(
      buildService({ removeCustomer }).remove('missing-id'),
    ).rejects.toEqual(new NotFoundException('Empresa não encontrada'));
  });
});
