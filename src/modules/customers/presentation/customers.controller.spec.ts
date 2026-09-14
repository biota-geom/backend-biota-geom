import { BadRequestException } from '@nestjs/common';
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
import { CustomerListResponseDTO } from './dto/customer-list-response.dto';
import { CustomerResponseDTO } from './dto/customer-response.dto';
import { LinkCustomerEsgMetricsDto } from './dto/link-customer-esg-metrics.dto';

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

  it('delegates customer deletion to the service', async () => {
    const { controller, service } = buildController();

    await expect(
      controller.deleteCustomer('customer-1'),
    ).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith('customer-1');
  });
});
