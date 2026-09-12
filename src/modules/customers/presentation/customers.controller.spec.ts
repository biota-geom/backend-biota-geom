import { AddressType, DocumentType } from '@prisma/client';
import { CustomersService } from '../infra/customers.service';
import { CustomerController } from './customers.controller';
import { CreateCustomerDto } from './dto/create-customer.dto';

describe('CustomerController', () => {
  it('returns the list from the customer service', async () => {
    const expected = [{ id: 'customer-1', name: 'Unidade Industrial RS' }];
    const service: Pick<CustomersService, 'findAll'> = {
      findAll: jest.fn().mockResolvedValue(expected),
    };
    const controller = new CustomerController(
      service as unknown as CustomersService,
    );

    await expect(controller.listCustomers()).resolves.toEqual(expected);
    expect(service.findAll).toHaveBeenCalledTimes(1);
  });

  it('maps the snake_case payload onto the domain shape and back', async () => {
    const createdAt = new Date('2026-09-11T12:00:00.000Z');
    const service: Pick<CustomersService, 'create'> = {
      create: jest.fn().mockResolvedValue({
        id: 'customer-1',
        name: 'Unidade Industrial RS',
        document: '12345678000199',
        documentType: DocumentType.CNPJ,
        email: 'contato@unidade.com.br',
        ownerName: 'Ana Silva',
        ownerEmail: 'ana.silva@unidade.com.br',
        ownerPhone: '+55 51 99999-0000',
        isActive: true,
        createdAt,
        updatedAt: createdAt,
        addressId: 'address-1',
        sectorId: 'sector-1',
        sector: { name: 'Agronegócio Sustentável' },
        address: {
          id: 'address-1',
          type: AddressType.BILLING,
          street: 'Av. Assis Brasil',
          number: '123',
          city: 'Porto Alegre',
          state: 'RS',
          postalCode: '91010-000',
          countryCode: 'BR',
        },
      }),
    };
    const controller = new CustomerController(
      service as unknown as CustomersService,
    );
    const dto: CreateCustomerDto = {
      name: 'Unidade Industrial RS',
      document: '12345678000199',
      document_type: DocumentType.CNPJ,
      sector_id: 'sector-1',
      email: 'contato@unidade.com.br',
      owner_name: 'Ana Silva',
      owner_email: 'ana.silva@unidade.com.br',
      owner_phone: '+55 51 99999-0000',
      address: {
        type: AddressType.BILLING,
        street: 'Av. Assis Brasil',
        number: '123',
        city: 'Porto Alegre',
        state: 'RS',
        postal_code: '91010-000',
        country_code: 'BR',
      },
    };

    const response = await controller.createCustomer(dto);

    expect(service.create).toHaveBeenCalledWith({
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
    });
    expect(response).toEqual({
      id: 'customer-1',
      name: 'Unidade Industrial RS',
      document: '12345678000199',
      document_type: DocumentType.CNPJ,
      email: 'contato@unidade.com.br',
      owner_name: 'Ana Silva',
      owner_email: 'ana.silva@unidade.com.br',
      owner_phone: '+55 51 99999-0000',
      is_active: true,
      sector_id: 'sector-1',
      segment: 'Agronegócio Sustentável',
      created_at: '2026-09-11T12:00:00.000Z',
      address: {
        id: 'address-1',
        type: AddressType.BILLING,
        street: 'Av. Assis Brasil',
        number: '123',
        city: 'Porto Alegre',
        state: 'RS',
        postal_code: '91010-000',
        country_code: 'BR',
      },
    });
  });

  it('reports a null sector and a missing address instead of failing', async () => {
    const createdAt = new Date('2026-09-11T12:00:00.000Z');
    const service: Pick<CustomersService, 'create'> = {
      create: jest.fn().mockResolvedValue({
        id: 'customer-2',
        name: 'Sem endereço',
        document: '98765432000111',
        documentType: DocumentType.CNPJ,
        email: 'contato@sem.com.br',
        ownerName: 'Bruno',
        ownerEmail: 'bruno@sem.com.br',
        ownerPhone: '+55 51 98888-0000',
        isActive: true,
        createdAt,
        updatedAt: createdAt,
        addressId: null,
        sectorId: null,
        sector: null,
        address: null,
      }),
    };
    const controller = new CustomerController(
      service as unknown as CustomersService,
    );

    const response = await controller.createCustomer({
      address: {},
    } as unknown as CreateCustomerDto);

    expect(response.segment).toBeNull();
    expect(response.address).toBeNull();
  });
});
