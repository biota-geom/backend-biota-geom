import { LegislationImpact } from '@prisma/client';
import { LicenseNotFoundError } from '../../licenses/domain/errors/license-not-found.error';
import { LicenseRepository } from '../../licenses/domain/licenses.repository';
import { LicenseLegislationNotFoundError } from '../domain/errors/license-legislation-not-found.error';
import { LicenseLegislation } from '../domain/license-legislation.entity';
import { LicenseLegislationRepository } from '../domain/license-legislations.repository';
import { UpdateLicenseLegislationUseCase } from './update-license-legislation.use-case';

const BASE = { licenseId: 'license-1', id: 'link-1', ownerUserId: 'owner-1' };

function build(options: { license?: unknown; current?: unknown } = {}) {
  const licenseRepository = {
    findByIdForOwner: jest
      .fn()
      .mockResolvedValue(
        'license' in options ? options.license : { id: 'license-1' },
      ),
  };
  const linkRepository = {
    findByIdForLicense: jest
      .fn()
      .mockResolvedValue(
        'current' in options ? options.current : { id: 'link-1', readAt: null },
      ),
    update: jest
      .fn()
      .mockImplementation((id: string, data: object) =>
        Promise.resolve({ id, ...data }),
      ),
  };
  const useCase = new UpdateLicenseLegislationUseCase(
    licenseRepository as unknown as LicenseRepository,
    linkRepository as unknown as LicenseLegislationRepository,
  );
  return { licenseRepository, linkRepository, useCase };
}

describe('UpdateLicenseLegislationUseCase', () => {
  afterEach(() => jest.useRealTimers());

  it('rejects a license the caller does not own', async () => {
    const { licenseRepository, linkRepository, useCase } = build({
      license: null,
    });

    await expect(useCase.execute(BASE)).rejects.toThrow(LicenseNotFoundError);
    expect(licenseRepository.findByIdForOwner).toHaveBeenCalledWith(
      'license-1',
      'owner-1',
    );
    expect(linkRepository.update).not.toHaveBeenCalled();
  });

  it('rejects a link that is not in the license', async () => {
    const { linkRepository, useCase } = build({ current: null });

    await expect(useCase.execute(BASE)).rejects.toThrow(
      LicenseLegislationNotFoundError,
    );
    expect(linkRepository.findByIdForLicense).toHaveBeenCalledWith(
      'link-1',
      'license-1',
    );
  });

  it('sets the impact', async () => {
    const { linkRepository, useCase } = build();

    await useCase.execute({ ...BASE, impact: LegislationImpact.HIGH });
    expect(linkRepository.update).toHaveBeenCalledWith('link-1', {
      impact: LegislationImpact.HIGH,
    });
  });

  it('clears the impact with null', async () => {
    const { linkRepository, useCase } = build();

    await useCase.execute({ ...BASE, impact: null });
    expect(linkRepository.update).toHaveBeenCalledWith('link-1', {
      impact: null,
    });
  });

  it('stamps read_at the first time it is marked as read', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-12T15:00:00.000Z'));
    const { linkRepository, useCase } = build();

    await useCase.execute({ ...BASE, read: true });
    expect(linkRepository.update).toHaveBeenCalledWith('link-1', {
      readAt: new Date('2026-11-12T15:00:00.000Z'),
    });
  });

  it('keeps the original read_at when already read', async () => {
    const current = {
      id: 'link-1',
      readAt: new Date('2026-11-04T10:00:00.000Z'),
    } as LicenseLegislation;
    const { linkRepository, useCase } = build({ current });

    await expect(useCase.execute({ ...BASE, read: true })).resolves.toBe(
      current,
    );
    expect(linkRepository.update).not.toHaveBeenCalled();
  });

  it('does nothing for an empty update', async () => {
    const { linkRepository, useCase } = build();

    await useCase.execute(BASE);
    expect(linkRepository.update).not.toHaveBeenCalled();
  });
});
