import { LegislationType, LicenseLegislationSource } from '@prisma/client';
import { LicenseNotFoundError } from '../../licenses/domain/errors/license-not-found.error';
import { LicenseRepository } from '../../licenses/domain/licenses.repository';
import { InvalidLegislationReferenceError } from '../domain/errors/invalid-legislation-reference.error';
import { LegislationAlreadyLinkedError } from '../domain/errors/legislation-already-linked.error';
import { LegislationNotFoundError } from '../domain/errors/legislation-not-found.error';
import { LegislationRepository } from '../domain/legislations.repository';
import { LicenseLegislationRepository } from '../domain/license-legislations.repository';
import { AddLicenseLegislationUseCase } from './add-license-legislation.use-case';

const LEGISLATION_DATA = {
  type: LegislationType.LEI,
  number: '12.305',
  year: 2010,
  issuingBody: 'Governo Federal',
  summary: 'Institui a PNRS.',
};

type Row = { id: string } | null;

function buildUseCase({
  license = { id: 'license-1' },
  catalogAct = { id: 'legislation-1' },
  existingLink = null,
}: { license?: Row; catalogAct?: Row; existingLink?: Row } = {}) {
  const licenseRepository = {
    findByIdForOwner: jest.fn().mockResolvedValue(license),
  };
  const legislationRepository = {
    findById: jest.fn().mockResolvedValue(catalogAct),
    findOrCreate: jest.fn().mockResolvedValue({ id: 'legislation-2' }),
  };
  const licenseLegislationRepository = {
    findByLicenseAndLegislation: jest.fn().mockResolvedValue(existingLink),
    create: jest.fn().mockResolvedValue({ id: 'link-1' }),
  };
  const useCase = new AddLicenseLegislationUseCase(
    licenseRepository as unknown as LicenseRepository,
    legislationRepository as unknown as LegislationRepository,
    licenseLegislationRepository as unknown as LicenseLegislationRepository,
  );

  return {
    useCase,
    licenseRepository,
    legislationRepository,
    licenseLegislationRepository,
  };
}

describe('AddLicenseLegislationUseCase', () => {
  it('links an act from the catalog as a manual entry', async () => {
    const { useCase, licenseRepository, licenseLegislationRepository } =
      buildUseCase();

    await expect(
      useCase.execute('license-1', 'owner-1', {
        legislationId: 'legislation-1',
        citedExcerpt: '…art. 3º…',
      }),
    ).resolves.toEqual({ id: 'link-1' });
    expect(licenseRepository.findByIdForOwner).toHaveBeenCalledWith(
      'license-1',
      'owner-1',
    );
    expect(licenseLegislationRepository.create).toHaveBeenCalledWith({
      licenseId: 'license-1',
      legislationId: 'legislation-1',
      source: LicenseLegislationSource.MANUAL,
      citedExcerpt: '…art. 3º…',
    });
  });

  it('reuses or creates the act from its data and defaults the excerpt to null', async () => {
    const { useCase, legislationRepository, licenseLegislationRepository } =
      buildUseCase();

    await useCase.execute('license-1', 'owner-1', {
      legislation: LEGISLATION_DATA,
    });

    expect(legislationRepository.findOrCreate).toHaveBeenCalledWith(
      LEGISLATION_DATA,
    );
    expect(legislationRepository.findById).not.toHaveBeenCalled();
    expect(licenseLegislationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        legislationId: 'legislation-2',
        citedExcerpt: null,
      }),
    );
  });

  it('rejects a license the caller does not own', async () => {
    const { useCase, licenseLegislationRepository } = buildUseCase({
      license: null,
    });

    await expect(
      useCase.execute('license-1', 'owner-1', {
        legislationId: 'legislation-1',
      }),
    ).rejects.toThrow(LicenseNotFoundError);
    expect(licenseLegislationRepository.create).not.toHaveBeenCalled();
  });

  it.each([
    ['neither', {}],
    ['both', { legislationId: 'legislation-1', legislation: LEGISLATION_DATA }],
  ])('rejects %s legislation_id and legislation data', async (_, input) => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.execute('license-1', 'owner-1', input),
    ).rejects.toThrow(InvalidLegislationReferenceError);
  });

  it('rejects an unknown catalog act', async () => {
    const { useCase } = buildUseCase({ catalogAct: null });

    await expect(
      useCase.execute('license-1', 'owner-1', {
        legislationId: 'legislation-9',
      }),
    ).rejects.toThrow(LegislationNotFoundError);
  });

  it('rejects an act already on the license radar', async () => {
    const { useCase, licenseLegislationRepository } = buildUseCase({
      existingLink: { id: 'link-0' },
    });

    await expect(
      useCase.execute('license-1', 'owner-1', {
        legislationId: 'legislation-1',
      }),
    ).rejects.toThrow(LegislationAlreadyLinkedError);
    expect(
      licenseLegislationRepository.findByLicenseAndLegislation,
    ).toHaveBeenCalledWith('license-1', 'legislation-1');
    expect(licenseLegislationRepository.create).not.toHaveBeenCalled();
  });
});
