import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { AUTH_MESSAGES } from '../../auth/presentation/messages/auth.messages.pt-br';
import { EsgPillar } from '../../esg-metrics/domain/esg-pillar';
import { LinkCustomerEsgMetricsUseCase } from '../application/link-customer-esg-metrics.use-case';
import { ListCustomerEsgMetricsUseCase } from '../application/list-customer-esg-metrics.use-case';
import { CustomersService } from '../infra/customers.service';
import {
  CustomerController,
  invalidCustomerIdException,
} from './customers.controller';
import { LinkCustomerEsgMetricsDto } from './dto/link-customer-esg-metrics.dto';

const CUSTOMER_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('CustomerController', () => {
  function buildController() {
    const service: Pick<CustomersService, 'findAll'> = {
      findAll: jest
        .fn<() => Promise<{ id: string }[]>>()
        .mockResolvedValue([{ id: 'customer-1' }]),
    };
    const linkExecute = jest.fn<(id: string, ids: string[]) => Promise<void>>();
    linkExecute.mockResolvedValue(undefined);
    const listExecute = jest.fn(() =>
      Promise.resolve([
        {
          id: 'metric-1',
          name: 'Water consumption',
          unit: 'm3',
          pillar: EsgPillar.AMBIENTAL,
          customerId: null,
          griStandardId: null,
        },
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
      { id: 'customer-1' },
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
});
