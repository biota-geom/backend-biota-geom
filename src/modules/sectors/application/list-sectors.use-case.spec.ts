import { SectorRepository } from '../domain/sectors.repository';
import { ListSectorsUseCase } from './list-sectors.use-case';

describe('ListSectorsUseCase', () => {
  it('returns every sector the repository reports', async () => {
    const sectors = [{ id: 'sector-1', name: 'Agronegócio Sustentável' }];
    const repository: Pick<SectorRepository, 'findAll'> = {
      findAll: jest.fn().mockResolvedValue(sectors),
    };
    const useCase = new ListSectorsUseCase(
      repository as unknown as SectorRepository,
    );

    await expect(useCase.listSectors()).resolves.toBe(sectors);
    expect(repository.findAll).toHaveBeenCalledTimes(1);
  });
});
