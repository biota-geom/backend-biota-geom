import { describe, expect, it, jest } from '@jest/globals';
import { CustomerEsgMetricRepository } from '../domain/customer-esg-metric.repository';
import { CustomerRepository } from '../domain/customers.repository';
import { CustomerNotFoundError } from '../domain/errors/customer-not-found.error';
import { EsgMetricsNotFoundError } from '../domain/errors/esg-metrics-not-found.error';
import { LinkCustomerEsgMetricsUseCase } from './link-customer-esg-metrics.use-case';

const CUSTOMER_ID = '550e8400-e29b-41d4-a716-446655440000';
const METRIC_A = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const METRIC_B = '550e8400-e29b-41d4-a716-446655440001';

function buildUseCase(overrides?: {
  customer?: { id: string } | null;
  existingMetricIds?: string[];
}) {
  const customerRepository = {
    findAll: jest.fn(),
    findOne: jest.fn(() =>
      Promise.resolve(
        overrides && 'customer' in overrides
          ? overrides.customer
          : { id: CUSTOMER_ID },
      ),
    ),
  } as unknown as CustomerRepository;

  const replaceAll = jest.fn<(id: string, ids: string[]) => Promise<void>>();
  replaceAll.mockResolvedValue(undefined);

  const findExistingMetricIds = jest.fn<(ids: string[]) => Promise<string[]>>();
  findExistingMetricIds.mockResolvedValue(
    overrides?.existingMetricIds ?? [METRIC_A, METRIC_B],
  );

  const customerEsgMetricRepository = {
    replaceAll,
    findExistingMetricIds,
    findMetricsByCustomerId: jest.fn(),
  } as unknown as CustomerEsgMetricRepository;

  return {
    useCase: new LinkCustomerEsgMetricsUseCase(
      customerRepository,
      customerEsgMetricRepository,
    ),
    replaceAll,
    findExistingMetricIds,
  };
}

describe('LinkCustomerEsgMetricsUseCase', () => {
  it('replaces links with unique metric ids', async () => {
    const { useCase, replaceAll, findExistingMetricIds } = buildUseCase();

    await useCase.execute(CUSTOMER_ID, [METRIC_A, METRIC_B, METRIC_A]);

    expect(findExistingMetricIds).toHaveBeenCalledWith([METRIC_A, METRIC_B]);
    expect(replaceAll).toHaveBeenCalledWith(CUSTOMER_ID, [METRIC_A, METRIC_B]);
  });

  it('unlinks every metric when metric_ids is empty', async () => {
    const { useCase, replaceAll, findExistingMetricIds } = buildUseCase();

    await useCase.execute(CUSTOMER_ID, []);

    expect(findExistingMetricIds).not.toHaveBeenCalled();
    expect(replaceAll).toHaveBeenCalledWith(CUSTOMER_ID, []);
  });

  it('rejects an unknown customer', async () => {
    const { useCase, replaceAll } = buildUseCase({ customer: null });

    await expect(useCase.execute(CUSTOMER_ID, [METRIC_A])).rejects.toThrow(
      CustomerNotFoundError,
    );
    expect(replaceAll).not.toHaveBeenCalled();
  });

  it('rejects when a metric id does not exist', async () => {
    const { useCase, replaceAll } = buildUseCase({
      existingMetricIds: [METRIC_A],
    });

    await expect(
      useCase.execute(CUSTOMER_ID, [METRIC_A, METRIC_B]),
    ).rejects.toThrow(EsgMetricsNotFoundError);
    expect(replaceAll).not.toHaveBeenCalled();
  });
});
