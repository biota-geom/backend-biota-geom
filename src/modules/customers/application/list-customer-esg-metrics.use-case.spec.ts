import { describe, expect, it, jest } from '@jest/globals';
import { EsgPillar } from '../../esg-metrics/domain/esg-pillar';
import { CustomerEsgMetricRepository } from '../domain/customer-esg-metric.repository';
import { CustomerRepository } from '../domain/customers.repository';
import { CustomerNotFoundError } from '../domain/errors/customer-not-found.error';
import { ListCustomerEsgMetricsUseCase } from './list-customer-esg-metrics.use-case';

const CUSTOMER_ID = '550e8400-e29b-41d4-a716-446655440000';

const METRIC = {
  id: 'metric-1',
  name: 'Water consumption',
  unit: 'm3',
  pillar: EsgPillar.AMBIENTAL,
  customerId: null,
  griStandardId: null,
};

describe('ListCustomerEsgMetricsUseCase', () => {
  it('returns linked metrics for an existing customer', async () => {
    const customerRepository = {
      findById: jest.fn(() => Promise.resolve({ id: CUSTOMER_ID })),
    } as unknown as CustomerRepository;
    const findMetricsByCustomerId = jest.fn<
      (customerId: string) => Promise<(typeof METRIC)[]>
    >(() => Promise.resolve([METRIC]));
    const customerEsgMetricRepository = {
      findMetricsByCustomerId,
    } as unknown as CustomerEsgMetricRepository;
    const useCase = new ListCustomerEsgMetricsUseCase(
      customerRepository,
      customerEsgMetricRepository,
    );

    await expect(useCase.execute(CUSTOMER_ID)).resolves.toEqual([METRIC]);
    expect(findMetricsByCustomerId).toHaveBeenCalledWith(CUSTOMER_ID);
  });

  it('rejects an unknown customer', async () => {
    const customerRepository = {
      findById: jest.fn(() => Promise.resolve(null)),
    } as unknown as CustomerRepository;
    const findMetricsByCustomerId = jest.fn();
    const customerEsgMetricRepository = {
      findMetricsByCustomerId,
    } as unknown as CustomerEsgMetricRepository;
    const useCase = new ListCustomerEsgMetricsUseCase(
      customerRepository,
      customerEsgMetricRepository,
    );

    await expect(useCase.execute(CUSTOMER_ID)).rejects.toThrow(
      CustomerNotFoundError,
    );
    expect(findMetricsByCustomerId).not.toHaveBeenCalled();
  });
});
