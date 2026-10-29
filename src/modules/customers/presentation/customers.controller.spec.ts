import { BadRequestException } from '@nestjs/common';
import {
  AddressType,
  DocumentType,
  LicenseConditionStatus,
} from '@prisma/client';
import { describe, expect, it, jest } from '@jest/globals';
import { AUTH_MESSAGES } from '../../auth/presentation/messages/auth.messages.pt-br';
import { EsgMetricEntity } from '../../esg-metrics/domain/entities/esg-metric.entity';
import { EsgPillar } from '../../esg-metrics/domain/esg-pillar';
import { LicenseConditionRiskLevel } from '../../licenses/domain/license-condition-risk-level';
import type { Response } from 'express';
import { GenerateCustomerReportUseCase } from '../application/generate-customer-report.use-case';
import { GetCustomerDashboardConditionsUseCase } from '../application/get-customer-dashboard-conditions.use-case';
import { LinkCustomerEsgMetricsUseCase } from '../application/link-customer-esg-metrics.use-case';
import { ListCustomerEsgMetricsUseCase } from '../application/list-customer-esg-metrics.use-case';
import { CustomersService } from '../infra/customers.service';
import {
  CustomerController,
  invalidCustomerIdException,
} from './customers.controller';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerDetailResponseDto } from './dto/customer-detail-response.dto';
import { CustomerLicenseDetailsResponseDto } from './dto/customer-license-details.dto';
import { CustomerListResponseDTO } from './dto/customer-list-response.dto';
import { CustomerResponseDTO } from './dto/customer-response.dto';
import { LinkCustomerEsgMetricsDto } from './dto/link-customer-esg-metrics.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

const CUSTOMER_ID = '550e8400-e29b-41d4-a716-446655440000';
// Stands in for what JwtAuthGuard puts on the request and @CurrentUser reads.
const AUTHENTICATED_USER = { id: 'owner-1' };

describe('CustomerController', () => {
  function buildController() {
    const listedCustomer: CustomerListResponseDTO = {
      id: 'customer-1',
      name: 'Unidade Industrial RS',
      document: '12345678000199',
      status: 'Ativo',
      segment: 'Siderurgia',
      location: 'Porto Alegre - RS',
      total_licenses: 10,
      updated_at: '2026-09-17T14:30:00.000Z',
      conformity_percentage: 70,
      attention_count: 3,
      expired_count: 0,
    };
    const service = {
      findAll: jest
        .fn<(ownerUserId: string) => Promise<CustomerListResponseDTO[]>>()
        .mockResolvedValue([listedCustomer]),
      findOne:
        jest.fn<
          (id: string, ownerUserId: string) => Promise<CustomerResponseDTO>
        >(),
      remove: jest
        .fn<(id: string, ownerUserId: string) => Promise<boolean>>()
        .mockResolvedValue(true),
      listCustomerDashboardLicenses:
        jest.fn<CustomersService['listCustomerDashboardLicenses']>(),
    };
    const linkExecute =
      jest.fn<
        (id: string, ownerUserId: string, ids: string[]) => Promise<void>
      >();
    linkExecute.mockResolvedValue(undefined);
    const listExecute = jest.fn<
      (customerId: string, ownerUserId: string) => Promise<EsgMetricEntity[]>
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
      {
        execute: jest.fn(),
      } as unknown as GetCustomerDashboardConditionsUseCase,
      {
        execute: jest.fn(),
      } as unknown as GenerateCustomerReportUseCase,
    );

    return {
      controller,
      service,
      linkExecute,
      listExecute,
    };
  }

  it('returns dashboard conditions using the authenticated owner', async () => {
    const condition = {
      id: 'condition-1',
      licenseId: 'license-1',
      name: 'MTR',
      description: null,
      environmentalDescriptor: 'Resíduos sólidos',
      responsibleAgency: 'FEPAM',
      dueDate: new Date('2026-10-25T00:00:00.000Z'),
      status: LicenseConditionStatus.REGULAR,
      hasDelivery: true,
      isViolated: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      riskLevel: LicenseConditionRiskLevel.RISK,
    };
    const execute = jest
      .fn<GetCustomerDashboardConditionsUseCase['execute']>()
      .mockResolvedValue({
        totalActive: 1,
        inCompliance: 0,
        compliancePercentage: 0,
        critical: [condition],
      });
    const controller = new CustomerController(
      {} as CustomersService,
      {} as LinkCustomerEsgMetricsUseCase,
      {} as ListCustomerEsgMetricsUseCase,
      { execute } as unknown as GetCustomerDashboardConditionsUseCase,
      {} as GenerateCustomerReportUseCase,
    );

    await expect(
      controller.getCustomerDashboardConditions(
        CUSTOMER_ID,
        AUTHENTICATED_USER,
      ),
    ).resolves.toEqual({
      total_active: 1,
      in_compliance: 0,
      compliance_percentage: 0,
      critical: [
        {
          id: 'condition-1',
          license_id: 'license-1',
          name: 'MTR',
          description: null,
          environmental_descriptor: 'Resíduos sólidos',
          responsible_agency: 'FEPAM',
          due_date: condition.dueDate.toISOString(),
          status: 'Regular',
          has_delivery: true,
          is_violated: false,
          risk_level: LicenseConditionRiskLevel.RISK,
        },
      ],
    });
    expect(execute).toHaveBeenCalledWith(CUSTOMER_ID, AUTHENTICATED_USER.id);
  });

  it('returns the list from the customer service', async () => {
    const { controller, service } = buildController();

    await expect(controller.listCustomers(AUTHENTICATED_USER)).resolves.toEqual(
      [
        {
          id: 'customer-1',
          name: 'Unidade Industrial RS',
          document: '12345678000199',
          status: 'Ativo',
          segment: 'Siderurgia',
          location: 'Porto Alegre - RS',
          total_licenses: 10,
          updated_at: '2026-09-17T14:30:00.000Z',
          conformity_percentage: 70,
          attention_count: 3,
          expired_count: 0,
        },
      ],
    );
    // The owner comes from the token, so the list cannot be widened by input.
    expect(service.findAll).toHaveBeenCalledWith(AUTHENTICATED_USER.id);
  });

  it('delegates the dashboard license lookup with the authenticated user id', async () => {
    const { controller, service } = buildController();
    const result: CustomerLicenseDetailsResponseDto = {
      header: { active_licenses: 1, pending_items: 1 },
      counts: { regular: 0, pending: 1, expired: 0 },
      critical: [],
    };
    service.listCustomerDashboardLicenses.mockResolvedValue(result);

    await expect(
      controller.listCustomerDashboardLicenses(CUSTOMER_ID, AUTHENTICATED_USER),
    ).resolves.toBe(result);
    expect(service.listCustomerDashboardLicenses).toHaveBeenCalledWith(
      CUSTOMER_ID,
      AUTHENTICATED_USER.id,
    );
  });

  it('maps linked metrics to the response dto', async () => {
    const { controller, listExecute } = buildController();

    await expect(
      controller.listCustomerEsgMetrics(CUSTOMER_ID, AUTHENTICATED_USER),
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
    expect(listExecute).toHaveBeenCalledWith(
      CUSTOMER_ID,
      AUTHENTICATED_USER.id,
    );
  });

  it('passes metric_ids to the link use case', async () => {
    const { controller, linkExecute } = buildController();
    const dto = Object.assign(new LinkCustomerEsgMetricsDto(), {
      metric_ids: ['f47ac10b-58cc-4372-a567-0e02b2c3d479'],
    });

    await expect(
      controller.linkCustomerEsgMetrics(CUSTOMER_ID, dto, AUTHENTICATED_USER),
    ).resolves.toBeUndefined();
    expect(linkExecute).toHaveBeenCalledWith(
      CUSTOMER_ID,
      AUTHENTICATED_USER.id,
      dto.metric_ids,
    );
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

    await expect(
      controller.getCustomer('customer-1', AUTHENTICATED_USER),
    ).resolves.toEqual(expected);
    expect(service.findOne).toHaveBeenCalledWith(
      'customer-1',
      AUTHENTICATED_USER.id,
    );
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
      {} as GetCustomerDashboardConditionsUseCase,
      {} as GenerateCustomerReportUseCase,
    );
    const dto = Object.assign(new UpdateCustomerDto(), {
      name: 'Empresa Atualizada',
    });

    await expect(
      controller.updateCustomer('customer-1', dto, AUTHENTICATED_USER),
    ).resolves.toEqual(expected);
    expect(service.update).toHaveBeenCalledWith(
      'customer-1',
      AUTHENTICATED_USER.id,
      dto,
    );
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
      {} as GetCustomerDashboardConditionsUseCase,
      {} as GenerateCustomerReportUseCase,
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

    const response = await controller.createCustomer(dto, AUTHENTICATED_USER);

    expect(service.create).toHaveBeenCalledWith({
      ownerUserId: AUTHENTICATED_USER.id,
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
      {} as GetCustomerDashboardConditionsUseCase,
      {} as GenerateCustomerReportUseCase,
    );

    const response = await controller.createCustomer(
      {
        address: {},
      } as unknown as CreateCustomerDto,
      AUTHENTICATED_USER,
    );

    expect(response.segment).toBeNull();
    expect(response.address).toBeNull();
  });

  it('delegates customer deletion to the service', async () => {
    const { controller, service } = buildController();

    await expect(
      controller.deleteCustomer('customer-1', AUTHENTICATED_USER),
    ).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith(
      'customer-1',
      AUTHENTICATED_USER.id,
    );
  });

  it('streams the report and names the download after the company', async () => {
    const content = Buffer.from('%PDF-1.7');
    const execute = jest
      .fn<GenerateCustomerReportUseCase['execute']>()
      .mockResolvedValue({
        fileName: 'relatorio-unidade-industrial-rs-2026-10-28.pdf',
        content,
      });
    const set = jest.fn();
    const controller = new CustomerController(
      {} as CustomersService,
      {} as LinkCustomerEsgMetricsUseCase,
      {} as ListCustomerEsgMetricsUseCase,
      {} as GetCustomerDashboardConditionsUseCase,
      { execute } as unknown as GenerateCustomerReportUseCase,
    );

    const file = await controller.downloadCustomerReport(
      CUSTOMER_ID,
      AUTHENTICATED_USER,
      { set } as unknown as Response,
    );

    expect(execute).toHaveBeenCalledWith(CUSTOMER_ID, AUTHENTICATED_USER.id);
    expect(set).toHaveBeenCalledWith({
      'Content-Type': 'application/pdf',
      'Content-Disposition':
        'attachment; filename="relatorio-unidade-industrial-rs-2026-10-28.pdf"',
      'Access-Control-Expose-Headers': 'Content-Disposition',
    });
    expect(file.getStream().read()).toEqual(content);
  });
});
