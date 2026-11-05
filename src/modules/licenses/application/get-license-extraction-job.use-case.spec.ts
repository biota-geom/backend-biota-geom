import { LicenseExtractionJobNotFoundError } from '../domain/errors/license-extraction-job-not-found.error';
import { GetLicenseExtractionJobUseCase } from './get-license-extraction-job.use-case';

describe('GetLicenseExtractionJobUseCase', () => {
  const build = (job: unknown) => {
    const get = jest.fn().mockResolvedValue(job);
    const useCase = new GetLicenseExtractionJobUseCase({
      get,
    } as never);

    return { useCase, get };
  };

  it("returns the caller's job", async () => {
    const { useCase, get } = build({ status: 'PENDING' });

    await expect(useCase.execute('job-1', 'user-1')).resolves.toEqual({
      status: 'PENDING',
    });
    expect(get).toHaveBeenCalledWith('job-1', 'user-1');
  });

  it('throws not found when the store has no such job for the caller', async () => {
    const { useCase } = build(null);

    await expect(useCase.execute('job-1', 'user-1')).rejects.toBeInstanceOf(
      LicenseExtractionJobNotFoundError,
    );
  });
});
