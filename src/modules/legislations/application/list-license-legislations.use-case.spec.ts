import { LegislationImpact } from '@prisma/client';
import { LicenseNotFoundError } from '../../licenses/domain/errors/license-not-found.error';
import { LicenseRepository } from '../../licenses/domain/licenses.repository';
import { LicenseLegislationRepository } from '../domain/license-legislations.repository';
import { ListLicenseLegislationsUseCase } from './list-license-legislations.use-case';

function buildUseCase(license: { id: string } | null) {
  const findByIdForOwner = jest.fn().mockResolvedValue(license);
  const findAllByLicenseId = jest.fn().mockResolvedValue([{ id: 'link-1' }]);
  const useCase = new ListLicenseLegislationsUseCase(
    { findByIdForOwner } as unknown as LicenseRepository,
    { findAllByLicenseId } as unknown as LicenseLegislationRepository,
  );

  return { useCase, findByIdForOwner, findAllByLicenseId };
}

describe('ListLicenseLegislationsUseCase', () => {
  it("lists the radar of the caller's license", async () => {
    const { useCase, findByIdForOwner, findAllByLicenseId } = buildUseCase({
      id: 'license-1',
    });

    await expect(useCase.execute('license-1', 'owner-1')).resolves.toEqual([
      { id: 'link-1' },
    ]);
    expect(findByIdForOwner).toHaveBeenCalledWith('license-1', 'owner-1');
    expect(findAllByLicenseId).toHaveBeenCalledWith('license-1', {});
  });

  it('passes the impact filter through', async () => {
    const { useCase, findAllByLicenseId } = buildUseCase({ id: 'license-1' });

    await useCase.execute('license-1', 'owner-1', {
      impact: LegislationImpact.HIGH,
    });
    expect(findAllByLicenseId).toHaveBeenCalledWith('license-1', {
      impact: LegislationImpact.HIGH,
    });
  });

  it('rejects a license the caller does not own', async () => {
    const { useCase, findAllByLicenseId } = buildUseCase(null);

    await expect(useCase.execute('license-1', 'owner-1')).rejects.toThrow(
      LicenseNotFoundError,
    );
    expect(findAllByLicenseId).not.toHaveBeenCalled();
  });
});
