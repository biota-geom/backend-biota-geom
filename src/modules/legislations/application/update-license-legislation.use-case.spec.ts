import { LegislationType } from '@prisma/client';
import { LicenseNotFoundError } from '../../licenses/domain/errors/license-not-found.error';
import { LicenseRepository } from '../../licenses/domain/licenses.repository';
import { LegislationAlreadyLinkedError } from '../domain/errors/legislation-already-linked.error';
import { LicenseLegislationNotFoundError } from '../domain/errors/license-legislation-not-found.error';
import { SharedLegislationNotEditableError } from '../domain/errors/shared-legislation-not-editable.error';
import { LegislationRepository } from '../domain/legislations.repository';
import { LicenseLegislationRepository } from '../domain/license-legislations.repository';
import { UpdateLicenseLegislationUseCase } from './update-license-legislation.use-case';

const CURRENT = {
  type: LegislationType.LEI,
  number: '12.305',
  year: 2010,
  issuingBody: 'Governo Federal',
  summary: 'Institui a PNRS.',
};

const LINK = {
  id: 'link-1',
  licenseId: 'license-1',
  legislationId: 'legislation-1',
  legislation: { id: 'legislation-1', ...CURRENT },
};

type Row = { id: string } | null;

function buildUseCase({
  license = { id: 'license-1' },
  link = LINK,
  linkedLicenses = 1,
  catalogMatch = null,
  alreadyLinked = null,
}: {
  license?: Row;
  link?: typeof LINK | null;
  linkedLicenses?: number;
  catalogMatch?: Row;
  alreadyLinked?: Row;
} = {}) {
  const licenseRepository = {
    findByIdForOwner: jest.fn().mockResolvedValue(license),
  };
  const legislationRepository = {
    findByIdentity: jest.fn().mockResolvedValue(catalogMatch),
    update: jest.fn().mockResolvedValue({}),
  };
  const licenseLegislationRepository = {
    findByIdForLicense: jest.fn().mockResolvedValue(link),
    countByLegislationId: jest.fn().mockResolvedValue(linkedLicenses),
    findByLicenseAndLegislation: jest.fn().mockResolvedValue(alreadyLinked),
    update: jest.fn().mockResolvedValue({ id: 'link-1' }),
  };
  const useCase = new UpdateLicenseLegislationUseCase(
    licenseRepository as unknown as LicenseRepository,
    legislationRepository as unknown as LegislationRepository,
    licenseLegislationRepository as unknown as LicenseLegislationRepository,
  );

  return { useCase, legislationRepository, licenseLegislationRepository };
}

describe('UpdateLicenseLegislationUseCase', () => {
  it('edits only the cited excerpt', async () => {
    const { useCase, legislationRepository, licenseLegislationRepository } =
      buildUseCase();

    await expect(
      useCase.execute('license-1', 'link-1', 'owner-1', {
        citedExcerpt: null,
      }),
    ).resolves.toEqual({ id: 'link-1' });
    expect(
      licenseLegislationRepository.findByIdForLicense,
    ).toHaveBeenCalledWith('link-1', 'license-1');
    expect(licenseLegislationRepository.update).toHaveBeenCalledWith('link-1', {
      citedExcerpt: null,
    });
    expect(legislationRepository.update).not.toHaveBeenCalled();
  });

  it('leaves the act alone when its data did not change, even if shared', async () => {
    const { useCase, licenseLegislationRepository } = buildUseCase({
      linkedLicenses: 3,
    });

    await useCase.execute('license-1', 'link-1', 'owner-1', {
      legislation: { ...CURRENT },
      citedExcerpt: 'novo trecho',
    });

    expect(
      licenseLegislationRepository.countByLegislationId,
    ).not.toHaveBeenCalled();
    expect(licenseLegislationRepository.update).toHaveBeenCalledWith('link-1', {
      citedExcerpt: 'novo trecho',
    });
  });

  it('edits an act only this license cites', async () => {
    const { useCase, legislationRepository, licenseLegislationRepository } =
      buildUseCase();
    const edited = { ...CURRENT, summary: null };

    await useCase.execute('license-1', 'link-1', 'owner-1', {
      legislation: edited,
    });

    expect(legislationRepository.findByIdentity).not.toHaveBeenCalled();
    expect(legislationRepository.update).toHaveBeenCalledWith(
      'legislation-1',
      edited,
    );
    expect(licenseLegislationRepository.update).toHaveBeenCalledWith('link-1', {
      legislationId: 'legislation-1',
    });
  });

  it('edits the identity of an act when no other act has it', async () => {
    const { useCase, legislationRepository } = buildUseCase();
    const edited = { ...CURRENT, number: '12.306' };

    await useCase.execute('license-1', 'link-1', 'owner-1', {
      legislation: edited,
    });

    expect(legislationRepository.findByIdentity).toHaveBeenCalledWith(edited);
    expect(legislationRepository.update).toHaveBeenCalledWith(
      'legislation-1',
      edited,
    );
  });

  it('points the entry to the catalog act the edited data matches', async () => {
    const { useCase, legislationRepository, licenseLegislationRepository } =
      buildUseCase({ catalogMatch: { id: 'legislation-2' } });

    await useCase.execute('license-1', 'link-1', 'owner-1', {
      legislation: { ...CURRENT, year: 2011 },
    });

    expect(
      licenseLegislationRepository.findByLicenseAndLegislation,
    ).toHaveBeenCalledWith('license-1', 'legislation-2');
    expect(legislationRepository.update).not.toHaveBeenCalled();
    expect(licenseLegislationRepository.update).toHaveBeenCalledWith('link-1', {
      legislationId: 'legislation-2',
    });
  });

  it('rejects edited data matching an act already on the radar', async () => {
    const { useCase, licenseLegislationRepository } = buildUseCase({
      catalogMatch: { id: 'legislation-2' },
      alreadyLinked: { id: 'link-2' },
    });

    await expect(
      useCase.execute('license-1', 'link-1', 'owner-1', {
        legislation: { ...CURRENT, year: 2011 },
      }),
    ).rejects.toThrow(LegislationAlreadyLinkedError);
    expect(licenseLegislationRepository.update).not.toHaveBeenCalled();
  });

  it('rejects editing an act other licenses also cite', async () => {
    const { useCase, legislationRepository } = buildUseCase({
      linkedLicenses: 2,
    });

    await expect(
      useCase.execute('license-1', 'link-1', 'owner-1', {
        legislation: { ...CURRENT, summary: 'Outra ementa' },
      }),
    ).rejects.toThrow(SharedLegislationNotEditableError);
    expect(legislationRepository.update).not.toHaveBeenCalled();
  });

  it('rejects a license the caller does not own', async () => {
    const { useCase, licenseLegislationRepository } = buildUseCase({
      license: null,
    });

    await expect(
      useCase.execute('license-1', 'link-1', 'owner-1', {}),
    ).rejects.toThrow(LicenseNotFoundError);
    expect(
      licenseLegislationRepository.findByIdForLicense,
    ).not.toHaveBeenCalled();
  });

  it('rejects an entry outside the license radar', async () => {
    const { useCase } = buildUseCase({ link: null });

    await expect(
      useCase.execute('license-1', 'link-1', 'owner-1', {}),
    ).rejects.toThrow(LicenseLegislationNotFoundError);
  });
});
