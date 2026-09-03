import type { EsgMetricEntity } from '../../domain/entities/esg-metric.entity';
import {
  EsgMetricRepository,
  type EsgMetricData,
} from '../../domain/repositories/esg-metric.repository';
import { CreateCustomEsgMetricUseCase } from './create-custom-esg-metric.use-case';

class InMemoryEsgMetricRepository extends EsgMetricRepository {
  data?: EsgMetricData;

  create(data: EsgMetricData): Promise<EsgMetricEntity> {
    this.data = data;
    return Promise.resolve({
      id: 'metric-1',
      ...data,
      griStandardId: data.griStandardId ?? null,
    });
  }
}

describe('CreateCustomEsgMetricUseCase', () => {
  it('creates a custom ESG metric through the repository', async () => {
    const repository = new InMemoryEsgMetricRepository();
    const useCase = new CreateCustomEsgMetricUseCase(repository);
    const data: EsgMetricData = {
      name: 'Water consumption',
      unit: 'm3',
      pillar: 'ambiental',
      clientId: 'client-1',
      griStandardId: 'gri-1',
    };

    await expect(useCase.execute(data)).resolves.toEqual({
      id: 'metric-1',
      ...data,
    });
    expect(repository.data).toEqual(data);
  });
});
