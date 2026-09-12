import { AddressType, DocumentType } from '@prisma/client';
import { CreateCustomerUseCase } from '../application/create-customer.use-case';
import { ListCustomersUseCase } from '../application/list-customers.use-case';
import { CreateCustomerData } from '../domain/create-customer.data';
import { CustomersService } from './customers.service';

function buildService(overrides: {
  listCustomers?: jest.Mock;
  createCustomer?: jest.Mock;
}): CustomersService {
  const listCustomersUseCase = {
    listCustomers: overrides.listCustomers ?? jest.fn(),
  };
  const createCustomerUseCase = {
    createCustomer: overrides.createCustomer ?? jest.fn(),
  };

  return new CustomersService(
    listCustomersUseCase as unknown as ListCustomersUseCase,
    createCustomerUseCase as unknown as CreateCustomerUseCase,
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
});
