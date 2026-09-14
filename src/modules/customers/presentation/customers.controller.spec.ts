import { BadRequestException } from '@nestjs/common';
import { AddressType, DocumentType } from '@prisma/client';
import { describe, expect, it, jest } from '@jest/globals';
import { AUTH_MESSAGES } from '../../auth/presentation/messages/auth.messages.pt-br';
import { EsgMetricEntity } from '../../esg-metrics/domain/entities/esg-metric.entity';
import { EsgPillar } from '../../esg-metrics/domain/esg-pillar';
import { LinkCustomerEsgMetricsUseCase } from '../application/link-customer-esg-metrics.use-case';
import { ListCustomerEsgMetricsUseCase } from '../application/list-customer-esg-metrics.use-case';
import { CustomersService } from '../infra/customers.service';
import {
  CustomerController,
  invalidCustomerIdException,
} from './customers.controller';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerDetailResponseDto } from './dto/customer-detail-response.dto';
import { CustomerListResponseDTO } from './dto/customer-list-response.dto';
import { CustomerResponseDTO } from './dto/customer-response.dto';
import { LinkCustomerEsgMetricsDto } from './dto/link-customer-esg-metrics.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

const CUSTOMER_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('CustomerController', () => {
  function buildController() {
    const listedCustomer: CustomerListResponseDTO = {
      id: 'customer-1',
      name: 'Unidade Industrial RS',
      status: 'Ativo',
      segment: 'Siderurgia',
      location: 'Porto Alegre - RS',
    };
    const service = {
      findAll: jest
        .fn<() => Promise<CustomerListResponseDTO[]>>()
        .mockResolvedValue([listedCustomer]),
      findOne: jest.fn<(id: string) => Promise<CustomerResponseDTO>>(),
      remove: jest
        .fn<(id: string) => Promise<boolean>>()
        .mockResolvedValue(true),
    };
    const linkExecute = jest.fn<(id: string, ids: string[]) => Promise<void>>();
    linkExecute.mockResolvedValue(undefined);
    const listExecute = jest.fn<
      (customerId: string) => Promise<EsgMetricEntity[]>
    >(() =>
      Promise.resolve([
        new EsgMetricEntity(
          'metric-1',
          'Water consumption',
          'm3',
          EsgPillar.AMBIENTAL,
          null,
          null,
        ),
      ]),
    );

    const controller = new CustomerController(
      service as unknown as CustomersService,
      { execute: linkExecute } as unknown as LinkCustomerEsgMetricsUseCase,
      { execute: listExecute } as unknown as ListCustomerEsgMetricsUseCase,
    );

    return { controller, service, linkExecute, listExecute };
  }

  it('returns the list from the customer service', async () => {
    const { controller, service } = buildController();

    await expect(controller.listCustomers()).resolves.toEqual([
      {
        id: 'customer-1',
        name: 'Unidade Industrial RS',
        status: 'Ativo',
        segment: 'Siderurgia',
        location: 'Porto Alegre - RS',
      },
    ]);
    expect(service.findAll).toHaveBeenCalledTimes(1);
  });

  it('maps linked metrics to the response dto', async () => {
    const { controller, listExecute } = buildController();

    await expect(
      controller.listCustomerEsgMetrics(CUSTOMER_ID),
    ).resolves.toEqual([
      {
        id: 'metric-1',
        name: 'Water consumption',
        unit: 'm3',
        pillar: EsgPillar.AMBIENTAL,
        customer_id: null,
        gri_standard_id: null,
      },
    ]);
    expect(listExecute).toHaveBeenCalledWith(CUSTOMER_ID);
  });

  it('passes metric_ids to the link use case', async () => {
    const { controller, linkExecute } = buildController();
    const dto = Object.assign(new LinkCustomerEsgMetricsDto(), {
      metric_ids: ['f47ac10b-58cc-4372-a567-0e02b2c3d479'],
    });

    await expect(
      controller.linkCustomerEsgMetrics(CUSTOMER_ID, dto),
    ).resolves.toBeUndefined();
    expect(linkExecute).toHaveBeenCalledWith(CUSTOMER_ID, dto.metric_ids);
  });

  it('builds the invalid uuid HTTP exception', () => {
    const error = invalidCustomerIdException();

    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.getResponse()).toEqual(
      expect.objectContaining({
        message: AUTH_MESSAGES.INVALID_REQUEST,
      }),
    );
  });

  it('delegates the detail lookup with the route id', async () => {
    const { controller, service } = buildController();
    const expected = {
      id: 'customer-1',
      name: 'Unidade Industrial RS',
    } as CustomerResponseDTO;
    service.findOne.mockResolvedValue(expected);

    await expect(controller.getCustomer('customer-1')).resolves.toEqual(
      expected,
    );
    expect(service.findOne).toHaveBeenCalledWith('customer-1');
  });

  it('delegates update to the customer service', async () => {
    const expected = {
      id: 'customer-1',
      name: 'Empresa Atualizada',
    } as CustomerDetailResponseDto;
    const service: Pick<CustomersService, 'update'> = {
      update: jest.fn<CustomersService['update']>().mockResolvedValue(expected),
    };
    const controller = new CustomerController(
      service as unknown as CustomersService,
      {} as LinkCustomerEsgMetricsUseCase,
      {} as ListCustomerEsgMetricsUseCase,
    );
    const dto = Object.assign(new UpdateCustomerDto(), {
      name: 'Empresa Atualizada',
    });

    await expect(controller.updateCustomer('customer-1', dto)).resolves.toEqual(
      expected,
    );
    expect(service.update).toHaveBeenCalledWith('customer-1', dto);
  });

  it('maps the snake_case payload onto the domain shape and back', async () => {
    const createdAt = new Date('2026-09-11T12:00:00.000Z');
    const service: Pick<CustomersService, 'create'> = {
      create: jest.fn<CustomersService['create']>().mockResolvedValue({
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
      } as unknown as Awaited<ReturnType<CustomersService['create']>>),
    };
    const controller = new CustomerController(
      service as unknown as CustomersService,
      {} as LinkCustomerEsgMetricsUseCase,
      {} as ListCustomerEsgMetricsUseCase,
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
      create: jest.fn<CustomersService['create']>().mockResolvedValue({
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
      } as unknown as Awaited<ReturnType<CustomersService['create']>>),
    };
    const controller = new CustomerController(
      service as unknown as CustomersService,
      {} as LinkCustomerEsgMetricsUseCase,
      {} as ListCustomerEsgMetricsUseCase,
    );

    const response = await controller.createCustomer({
      address: {},
    } as unknown as CreateCustomerDto);

    expect(response.segment).toBeNull();
    expect(response.address).toBeNull();
  });

  it('delegates customer deletion to the service', async () => {
    const { controller, service } = buildController();

    await expect(
      controller.deleteCustomer('customer-1'),
    ).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith('customer-1');
  });
});
