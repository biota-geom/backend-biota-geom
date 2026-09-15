import { describe, expect, it, jest } from '@jest/globals';
import { EsgPillar } from '../../esg-metrics/domain/esg-pillar';
import { CustomerEsgMetricRepository } from '../domain/customer-esg-metric.repository';
import { CustomerRepository } from '../domain/customers.repository';
import { CustomerNotFoundError } from '../domain/errors/customer-not-found.error';
import { ListCustomerEsgMetricsUseCase } from './list-customer-esg-metrics.use-case';

const CUSTOMER_ID = '550e8400-e29b-41d4-a716-446655440000';
const OWNER = 'owner-1';

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
    const findOne = jest.fn<
      (id: string, ownerUserId: string) => Promise<{ id: string }>
    >(() => Promise.resolve({ id: CUSTOMER_ID }));
    const customerRepository = {
      findOne,
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

    await expect(useCase.execute(CUSTOMER_ID, OWNER)).resolves.toEqual([
      METRIC,
    ]);
    // Scoped lookup: the metrics are only read after the customer is confirmed
    // to belong to the authenticated owner.
    expect(findOne).toHaveBeenCalledWith(CUSTOMER_ID, OWNER);
    expect(findMetricsByCustomerId).toHaveBeenCalledWith(CUSTOMER_ID);
  });

  // null covers both "no such customer" and "customer of another owner".
  it('rejects a customer that is unknown or owned by another account', async () => {
    const customerRepository = {
      findOne: jest.fn(() => Promise.resolve(null)),
    } as unknown as CustomerRepository;
    const findMetricsByCustomerId = jest.fn();
    const customerEsgMetricRepository = {
      findMetricsByCustomerId,
    } as unknown as CustomerEsgMetricRepository;
    const useCase = new ListCustomerEsgMetricsUseCase(
      customerRepository,
      customerEsgMetricRepository,
    );

    await expect(useCase.execute(CUSTOMER_ID, OWNER)).rejects.toThrow(
      CustomerNotFoundError,
    );
    expect(findMetricsByCustomerId).not.toHaveBeenCalled();
  });
});
