import { NotFoundException } from '@nestjs/common';
import { FindCustomerUseCase } from '../application/find-a-customer.use-case';
import { ListCustomersUseCase } from '../application/list-customers.use-case';
import { RemoveCustomerUseCase } from '../application/remove-customer.use-case';
import { UpdateCustomerUseCase } from '../application/update-customer.use-case';
import { UpdateCustomerDto } from '../presentation/dto/update-customer.dto';
import { CustomersService } from './customers.service';

describe('CustomersService', () => {
  it('delegates the list operation to the use case', async () => {
    const result = [{ id: 'customer-1', name: 'Unidade Industrial RS' }];
    const listCustomersUseCase: Pick<ListCustomersUseCase, 'listCustomers'> = {
      listCustomers: jest.fn().mockResolvedValue(result),
    };
    const findCustomerUseCase = {} as FindCustomerUseCase;
    const updateCustomerUseCase: Pick<UpdateCustomerUseCase, 'execute'> = {
      execute: jest.fn(),
    };
    const removeCustomerUseCase = {
      removeCustomer: jest.fn(),
    } as unknown as RemoveCustomerUseCase;
    const service = new CustomersService(
      listCustomersUseCase as unknown as ListCustomersUseCase,
      findCustomerUseCase,
      updateCustomerUseCase as unknown as UpdateCustomerUseCase,
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
      {} as UpdateCustomerUseCase,
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
      {} as UpdateCustomerUseCase,
      {} as RemoveCustomerUseCase,
    );

    await expect(service.findOne('missing-id')).rejects.toThrow(
      'Empresa não encontrada',
    );
  });

  it('delegates the update operation to the use case and maps the response', async () => {
    const listCustomersUseCase: Pick<ListCustomersUseCase, 'listCustomers'> = {
      listCustomers: jest.fn(),
    };
    const findCustomerUseCase = {} as FindCustomerUseCase;
    const updateCustomerUseCase: Pick<UpdateCustomerUseCase, 'execute'> = {
      execute: jest.fn().mockResolvedValue({
        id: 'customer-1',
        name: 'Empresa Atualizada',
        document: '12345678000199',
        documentType: 'cnpj',
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
          type: 'billing',
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
        esgIndicatorIds: ['metric-1'],
      }),
    };
    const removeCustomerUseCase = {
      removeCustomer: jest.fn(),
    } as unknown as RemoveCustomerUseCase;
    const service = new CustomersService(
      listCustomersUseCase as unknown as ListCustomersUseCase,
      findCustomerUseCase,
      updateCustomerUseCase as unknown as UpdateCustomerUseCase,
      removeCustomerUseCase,
    );

    const dto = Object.assign(new UpdateCustomerDto(), {
      name: 'Empresa Atualizada',
      document: '12345678000199',
      document_type: 'cnpj',
      sector_id: 'sector-1',
      responsible_name: 'Novo Responsável',
      responsible_email: 'novo@empresa.com',
      address: { type: 'billing', state: 'RS', city: 'Canoas' },
      esg_indicator_ids: ['metric-1'],
    });

    const response = await service.update('customer-1', dto);

    expect(response).toMatchObject({
      id: 'customer-1',
      name: 'Empresa Atualizada',
      responsible_name: 'Novo Responsável',
      esg_indicator_ids: ['metric-1'],
    });
    expect(response.address).toMatchObject({ city: 'Canoas', state: 'RS' });
    expect(updateCustomerUseCase.execute).toHaveBeenCalledWith('customer-1', {
      name: 'Empresa Atualizada',
      document: '12345678000199',
      documentType: 'cnpj',
      email: undefined,
      sectorId: 'sector-1',
      ownerName: 'Novo Responsável',
      ownerEmail: 'novo@empresa.com',
      ownerPhone: undefined,
      address: {
        type: 'billing',
        street: undefined,
        number: undefined,
        city: 'Canoas',
        state: 'RS',
        postalCode: undefined,
        countryCode: undefined,
      },
      esgIndicatorIds: ['metric-1'],
    });
  });

  it('removes a customer through the remove use case', async () => {
    const removeCustomer = jest.fn().mockResolvedValue(true);
    const removeCustomerUseCase = {
      removeCustomer,
    } as unknown as RemoveCustomerUseCase;
    const service = new CustomersService(
      {} as ListCustomersUseCase,
      {} as FindCustomerUseCase,
      {} as UpdateCustomerUseCase,
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
      {} as UpdateCustomerUseCase,
      removeCustomerUseCase,
    );

    await expect(service.remove('missing-id')).rejects.toEqual(
      new NotFoundException('Empresa não encontrada'),
    );
  });
});
