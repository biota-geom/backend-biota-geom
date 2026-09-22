import { IssuingAgencyRepository } from '../domain/issuing-agencies.repository';
import { ListIssuingAgenciesUseCase } from './list-issuing-agencies.use-case';

describe('ListIssuingAgenciesUseCase', () => {
  it('returns every issuing agency the repository reports', async () => {
    const agencies = [{ id: 'agency-1', name: 'FEPAM' }];
    const repository: Pick<IssuingAgencyRepository, 'findAll'> = {
      findAll: jest.fn().mockResolvedValue(agencies),
    };
    const useCase = new ListIssuingAgenciesUseCase(
      repository as unknown as IssuingAgencyRepository,
    );

    await expect(useCase.listIssuingAgencies()).resolves.toBe(agencies);
    expect(repository.findAll).toHaveBeenCalledTimes(1);
  });
});
