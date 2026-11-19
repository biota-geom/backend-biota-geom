import { LegislationImpact, LegislationType } from '@prisma/client';
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
  readAt: null as Date | null,
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
    markAsReadIfUnread: jest.fn().mockResolvedValue({
      id: 'link-1',
      readAt: new Date('2026-11-12T15:00:00.000Z'),
    }),
  };
  const useCase = new UpdateLicenseLegislationUseCase(
    licenseRepository as unknown as LicenseRepository,
    legislationRepository as unknown as LegislationRepository,
    licenseLegislationRepository as unknown as LicenseLegislationRepository,
  );

  return { useCase, legislationRepository, licenseLegislationRepository };
}

describe('UpdateLicenseLegislationUseCase', () => {
  afterEach(() => jest.useRealTimers());

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

  it('saves the technical analysis without touching the act', async () => {
    const { useCase, legislationRepository, licenseLegislationRepository } =
      buildUseCase();

    await useCase.execute('license-1', 'link-1', 'owner-1', {
      technicalAnalysis: 'Impacta o armazenamento de resíduos.',
    });

    expect(licenseLegislationRepository.update).toHaveBeenCalledWith('link-1', {
      technicalAnalysis: 'Impacta o armazenamento de resíduos.',
    });
    expect(legislationRepository.update).not.toHaveBeenCalled();
  });

  it('clears the technical analysis when null is sent', async () => {
    const { useCase, licenseLegislationRepository } = buildUseCase();

    await useCase.execute('license-1', 'link-1', 'owner-1', {
      technicalAnalysis: null,
    });

    expect(licenseLegislationRepository.update).toHaveBeenCalledWith('link-1', {
      technicalAnalysis: null,
    });
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

  it('sets the impact', async () => {
    const { useCase, licenseLegislationRepository } = buildUseCase();

    await useCase.execute('license-1', 'link-1', 'owner-1', {
      impact: LegislationImpact.HIGH,
    });
    expect(licenseLegislationRepository.update).toHaveBeenCalledWith('link-1', {
      impact: LegislationImpact.HIGH,
    });
  });

  it('clears the impact with null', async () => {
    const { useCase, licenseLegislationRepository } = buildUseCase();

    await useCase.execute('license-1', 'link-1', 'owner-1', {
      impact: null,
    });
    expect(licenseLegislationRepository.update).toHaveBeenCalledWith('link-1', {
      impact: null,
    });
  });

  it('atomically stamps read_at the first time it is marked as read', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-12T15:00:00.000Z'));
    const { useCase, licenseLegislationRepository } = buildUseCase();

    await useCase.execute('license-1', 'link-1', 'owner-1', { read: true });
    expect(
      licenseLegislationRepository.markAsReadIfUnread,
    ).toHaveBeenCalledWith('link-1', new Date('2026-11-12T15:00:00.000Z'));
    expect(licenseLegislationRepository.update).not.toHaveBeenCalled();
  });

  it('keeps the original read_at when already read', async () => {
    const current = {
      ...LINK,
      readAt: new Date('2026-11-04T10:00:00.000Z'),
    };
    const { useCase, licenseLegislationRepository } = buildUseCase({
      link: current,
    });

    await expect(
      useCase.execute('license-1', 'link-1', 'owner-1', { read: true }),
    ).resolves.toBe(current);
    expect(licenseLegislationRepository.update).not.toHaveBeenCalled();
    expect(
      licenseLegislationRepository.markAsReadIfUnread,
    ).not.toHaveBeenCalled();
  });

  it('does nothing for an empty update', async () => {
    const { useCase, licenseLegislationRepository } = buildUseCase();

    await useCase.execute('license-1', 'link-1', 'owner-1', {});
    expect(licenseLegislationRepository.update).not.toHaveBeenCalled();
    expect(
      licenseLegislationRepository.markAsReadIfUnread,
    ).not.toHaveBeenCalled();
  });

  it('applies other updates and marks as read independently', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-12T15:00:00.000Z'));
    const { useCase, licenseLegislationRepository } = buildUseCase();

    await useCase.execute('license-1', 'link-1', 'owner-1', {
      impact: LegislationImpact.HIGH,
      read: true,
    });

    expect(licenseLegislationRepository.update).toHaveBeenCalledWith('link-1', {
      impact: LegislationImpact.HIGH,
    });
    expect(
      licenseLegislationRepository.markAsReadIfUnread,
    ).toHaveBeenCalledWith('link-1', new Date('2026-11-12T15:00:00.000Z'));
  });

  it('accepts object input shape', async () => {
    const { useCase, licenseLegislationRepository } = buildUseCase();

    await useCase.execute({
      licenseId: 'license-1',
      id: 'link-1',
      ownerUserId: 'owner-1',
      impact: LegislationImpact.LOW,
    });
    expect(licenseLegislationRepository.update).toHaveBeenCalledWith('link-1', {
      impact: LegislationImpact.LOW,
    });
  });
});
