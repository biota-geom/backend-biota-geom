import { describe, expect, it, jest } from '@jest/globals';
import type { EsgMetricEntity } from '../../domain/entities/esg-metric.entity';
import { EsgPillar } from '../../domain/esg-pillar';
import { EsgMetricRepository } from '../../domain/repositories/esg-metric.repository';
import { ListEsgMetricsUseCase } from './list-esg-metrics.use-case';

class InMemoryEsgMetricRepository extends EsgMetricRepository {
  constructor(private readonly metrics: EsgMetricEntity[]) {
    super();
  }

  create(): Promise<EsgMetricEntity> {
    throw new Error('Not implemented');
  }

  findVisibleToCustomer = jest.fn((customerId: string) =>
    Promise.resolve(
      this.metrics.filter(
        (metric) =>
          metric.customerId === null || metric.customerId === customerId,
      ),
    ),
  );

  findByCustomerIdAndName(): Promise<EsgMetricEntity | null> {
    throw new Error('Not implemented');
  }
}

describe('ListEsgMetricsUseCase', () => {
  it('delegates listing to the repository using the authenticated customer id', async () => {
    const metrics: EsgMetricEntity[] = [
      {
        id: 'metric-1',
        name: 'Water consumption',
        unit: 'm3',
        pillar: EsgPillar.AMBIENTAL,
        customerId: null,
        griStandardId: null,
      },
    ];
    const repository = new InMemoryEsgMetricRepository(metrics);
    const useCase = new ListEsgMetricsUseCase(repository);

    await expect(useCase.execute('customer-1')).resolves.toEqual(metrics);
    expect(repository.findVisibleToCustomer).toHaveBeenCalledWith('customer-1');
  });
});
