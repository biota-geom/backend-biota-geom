import { describe, expect, it } from '@jest/globals';
import type { EsgMetricEntity } from '../../domain/entities/esg-metric.entity';
import { EsgMetricAlreadyExistsError } from '../../domain/errors/esg-metric-already-exists.error';
import { EsgPillar } from '../../domain/esg-pillar';
import {
  EsgMetricRepository,
  type EsgMetricData,
} from '../../domain/repositories/esg-metric.repository';
import { CreateCustomEsgMetricUseCase } from './create-custom-esg-metric.use-case';

class InMemoryEsgMetricRepository extends EsgMetricRepository {
  data?: EsgMetricData;
  existing: EsgMetricEntity | null = null;

  create(data: EsgMetricData): Promise<EsgMetricEntity> {
    this.data = data;
    return Promise.resolve({
      id: 'metric-1',
      ...data,
      griStandardId: data.griStandardId ?? null,
    });
  }

  findByCustomerIdAndName(
    customerId: string,
    name: string,
  ): Promise<EsgMetricEntity | null> {
    if (
      this.existing?.customerId === customerId &&
      this.existing.name === name
    ) {
      return Promise.resolve(this.existing);
    }

    return Promise.resolve(null);
  }
}

describe('CreateCustomEsgMetricUseCase', () => {
  const data: EsgMetricData = {
    name: 'Water consumption',
    unit: 'm3',
    pillar: EsgPillar.AMBIENTAL,
    customerId: 'client-1',
    griStandardId: 'gri-1',
  };

  it('creates a custom ESG metric through the repository', async () => {
    const repository = new InMemoryEsgMetricRepository();
    const useCase = new CreateCustomEsgMetricUseCase(repository);

    await expect(useCase.execute(data)).resolves.toEqual({
      id: 'metric-1',
      ...data,
    });
    expect(repository.data).toEqual(data);
  });

  it('rejects a name already used by the same customer', async () => {
    const repository = new InMemoryEsgMetricRepository();
    repository.existing = {
      id: 'metric-1',
      ...data,
      griStandardId: data.griStandardId ?? null,
    };
    const useCase = new CreateCustomEsgMetricUseCase(repository);

    await expect(useCase.execute(data)).rejects.toThrow(
      EsgMetricAlreadyExistsError,
    );
    expect(repository.data).toBeUndefined();
  });
});
