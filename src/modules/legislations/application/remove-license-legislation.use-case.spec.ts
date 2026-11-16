import { LicenseNotFoundError } from '../../licenses/domain/errors/license-not-found.error';
import { LicenseRepository } from '../../licenses/domain/licenses.repository';
import { LicenseLegislationNotFoundError } from '../domain/errors/license-legislation-not-found.error';
import { LicenseLegislationRepository } from '../domain/license-legislations.repository';
import { RemoveLicenseLegislationUseCase } from './remove-license-legislation.use-case';

type Row = { id: string } | null;

function buildUseCase({
  license = { id: 'license-1' },
  link = { id: 'link-1' },
}: { license?: Row; link?: Row } = {}) {
  const findByIdForOwner = jest.fn().mockResolvedValue(license);
  const findByIdForLicense = jest.fn().mockResolvedValue(link);
  const remove = jest.fn().mockResolvedValue(undefined);
  const useCase = new RemoveLicenseLegislationUseCase(
    { findByIdForOwner } as unknown as LicenseRepository,
    {
      findByIdForLicense,
      delete: remove,
    } as unknown as LicenseLegislationRepository,
  );

  return { useCase, findByIdForLicense, remove };
}

describe('RemoveLicenseLegislationUseCase', () => {
  it('removes the entry from the license radar', async () => {
    const { useCase, findByIdForLicense, remove } = buildUseCase();

    await expect(
      useCase.execute('license-1', 'link-1', 'owner-1'),
    ).resolves.toBeUndefined();
    expect(findByIdForLicense).toHaveBeenCalledWith('link-1', 'license-1');
    expect(remove).toHaveBeenCalledWith('link-1');
  });

  it('rejects a license the caller does not own', async () => {
    const { useCase, remove } = buildUseCase({ license: null });

    await expect(
      useCase.execute('license-1', 'link-1', 'owner-1'),
    ).rejects.toThrow(LicenseNotFoundError);
    expect(remove).not.toHaveBeenCalled();
  });

  it('rejects an entry outside the license radar', async () => {
    const { useCase, remove } = buildUseCase({ link: null });

    await expect(
      useCase.execute('license-1', 'link-1', 'owner-1'),
    ).rejects.toThrow(LicenseLegislationNotFoundError);
    expect(remove).not.toHaveBeenCalled();
  });
});
