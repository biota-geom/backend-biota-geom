import {
  LegislationImpact,
  LegislationType,
  LicenseLegislationSource,
} from '@prisma/client';
import { LicenseNotFoundError } from '../../licenses/domain/errors/license-not-found.error';
import { LicenseRepository } from '../../licenses/domain/licenses.repository';
import { LegislationRepository } from '../domain/legislations.repository';
import { LicenseLegislationRepository } from '../domain/license-legislations.repository';
import { AddLicenseLegislationsUseCase } from './add-license-legislations.use-case';

describe('AddLicenseLegislationsUseCase', () => {
  const license = { id: 'license-1' };
  const legislation = {
    id: 'legislation-1',
    type: LegislationType.LEI,
    number: '12.305',
    year: 2010,
    issuingBody: 'Governo Federal',
    summary: null,
  };

  it('creates links by catalog ID and inline legislation after checking ownership', async () => {
    const findByIdForOwner = jest.fn().mockResolvedValue(license);
    const findById = jest.fn().mockResolvedValue(legislation);
    const findOrCreate = jest.fn().mockResolvedValue({
      ...legislation,
      id: 'legislation-2',
    });
    const createMany = jest.fn().mockResolvedValue([]);
    const useCase = new AddLicenseLegislationsUseCase(
      { findByIdForOwner } as unknown as LicenseRepository,
      { findById, findOrCreate } as unknown as LegislationRepository,
      { createMany } as unknown as LicenseLegislationRepository,
    );

    await useCase.execute('license-1', 'user-1', [
      {
        legislationId: 'legislation-1',
        source: LicenseLegislationSource.MANUAL,
      },
      {
        legislation: {
          type: LegislationType.RESOLUCAO,
          number: '237',
          year: 1997,
          issuingBody: 'CONAMA',
          summary: 'Licenciamento ambiental.',
        },
        source: LicenseLegislationSource.SCAN,
        citedExcerpt: 'Excerto.',
        impact: LegislationImpact.MODERATE,
      },
    ]);

    expect(findByIdForOwner).toHaveBeenCalledWith('license-1', 'user-1');
    expect(findById).toHaveBeenCalledWith('legislation-1');
    expect(findOrCreate).toHaveBeenCalledWith({
      type: LegislationType.RESOLUCAO,
      number: '237',
      year: 1997,
      issuingBody: 'CONAMA',
      summary: 'Licenciamento ambiental.',
    });
    expect(createMany).toHaveBeenCalledWith([
      {
        licenseId: 'license-1',
        legislationId: 'legislation-1',
        source: LicenseLegislationSource.MANUAL,
        citedExcerpt: undefined,
        impact: undefined,
      },
      {
        licenseId: 'license-1',
        legislationId: 'legislation-2',
        source: LicenseLegislationSource.SCAN,
        citedExcerpt: 'Excerto.',
        impact: LegislationImpact.MODERATE,
      },
    ]);
  });

  it('does not access legislation or create links for an unowned license', async () => {
    const findByIdForOwner = jest.fn().mockResolvedValue(null);
    const findOrCreate = jest.fn();
    const createMany = jest.fn();
    const useCase = new AddLicenseLegislationsUseCase(
      { findByIdForOwner } as unknown as LicenseRepository,
      { findOrCreate } as unknown as LegislationRepository,
      { createMany } as unknown as LicenseLegislationRepository,
    );

    await expect(
      useCase.execute('license-1', 'user-1', []),
    ).rejects.toBeInstanceOf(LicenseNotFoundError);
    expect(findOrCreate).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });
});
