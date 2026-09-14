import { NotFoundException } from '@nestjs/common';
import { AddressType, DocumentType } from '@prisma/client';
import { CreateCustomerUseCase } from '../application/create-customer.use-case';
import { FindCustomerUseCase } from '../application/find-a-customer.use-case';
import { ListCustomersUseCase } from '../application/list-customers.use-case';
import { RemoveCustomerUseCase } from '../application/remove-customer.use-case';
import { UpdateCustomerUseCase } from '../application/update-customer.use-case';
import { CreateCustomerData } from '../domain/create-customer.data';
import { UpdateCustomerDto } from '../presentation/dto/update-customer.dto';
import { CustomersService } from './customers.service';

function buildService(overrides: {
  listCustomers?: jest.Mock;
  createCustomer?: jest.Mock;
  findCustomer?: jest.Mock;
  updateCustomerUseCase?: Pick<UpdateCustomerUseCase, 'execute'>;
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
  const updateCustomerUseCase = overrides.updateCustomerUseCase ?? {
    execute: jest.fn(),
  };
  const removeCustomerUseCase = {
    removeCustomer: overrides.removeCustomer ?? jest.fn(),
  };

  return new CustomersService(
    listCustomersUseCase as unknown as ListCustomersUseCase,
    createCustomerUseCase as unknown as CreateCustomerUseCase,
    findCustomerUseCase as unknown as FindCustomerUseCase,
    updateCustomerUseCase as unknown as UpdateCustomerUseCase,
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

  it('delegates the update operation to the use case and maps the response', async () => {
    const updateCustomerUseCase: Pick<UpdateCustomerUseCase, 'execute'> = {
      execute: jest.fn().mockResolvedValue({
        id: 'customer-1',
        name: 'Empresa Atualizada',
        document: '12345678000199',
        documentType: DocumentType.CNPJ,
        email: 'contato@empresa.com',
        ownerName: 'Novo Responsável',
        ownerEmail: 'novo@empresa.com',
        ownerPhone: '+55 51 99988-7766',
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        addressId: 'address-1',
        address: {
          id: 'address-1',
          type: AddressType.BILLING,
          street: 'Avenida das Palmeiras',
          number: '1000',
          city: 'Canoas',
          state: 'RS',
          postalCode: '90000-000',
          countryCode: 'BR',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        sectorId: 'sector-1',
        sector: null,
      }),
    };

    const dto = Object.assign(new UpdateCustomerDto(), {
      name: 'Empresa Atualizada',
      document: '12345678000199',
      document_type: DocumentType.CNPJ,
      sector_id: 'sector-1',
      responsible_name: 'Novo Responsável',
      responsible_email: 'novo@empresa.com',
      address: { type: AddressType.BILLING, state: 'RS', city: 'Canoas' },
    });

    const response = await buildService({ updateCustomerUseCase }).update(
      'customer-1',
      dto,
    );

    expect(response).toMatchObject({
      id: 'customer-1',
      name: 'Empresa Atualizada',
      responsible_name: 'Novo Responsável',
    });
    expect(response.address).toMatchObject({ city: 'Canoas', state: 'RS' });
    expect(updateCustomerUseCase.execute).toHaveBeenCalledWith('customer-1', {
      name: 'Empresa Atualizada',
      document: '12345678000199',
      documentType: DocumentType.CNPJ,
      email: undefined,
      sectorId: 'sector-1',
      ownerName: 'Novo Responsável',
      ownerEmail: 'novo@empresa.com',
      ownerPhone: undefined,
      address: {
        type: AddressType.BILLING,
        street: undefined,
        number: undefined,
        city: 'Canoas',
        state: 'RS',
        postalCode: undefined,
        countryCode: undefined,
      },
    });
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
