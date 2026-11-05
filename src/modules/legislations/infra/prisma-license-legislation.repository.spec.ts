import { LicenseLegislationSource } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaLicenseLegislationRepository } from './prisma-license-legislation.repository';

function build(model: Record<string, jest.Mock>) {
  return new PrismaLicenseLegislationRepository({
    licenseLegislation: model,
  } as unknown as PrismaService);
}

describe('PrismaLicenseLegislationRepository', () => {
  it('lists a license radar newest first, with the legislation', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'link-1' }]);

    await expect(
      build({ findMany }).findAllByLicenseId('license-1'),
    ).resolves.toEqual([{ id: 'link-1' }]);
    expect(findMany).toHaveBeenCalledWith({
      where: { licenseId: 'license-1' },
      include: { legislation: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  });

  it('scopes the lookup of a link to its license', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);

    await expect(
      build({ findFirst }).findByIdForLicense('link-1', 'license-1'),
    ).resolves.toBeNull();
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'link-1', licenseId: 'license-1' },
      include: { legislation: true },
    });
  });

  it('creates a link', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'link-1' });
    const data = {
      licenseId: 'license-1',
      legislationId: 'legislation-1',
      source: LicenseLegislationSource.SCAN,
    };

    await expect(build({ create }).create(data)).resolves.toEqual({
      id: 'link-1',
    });
    expect(create).toHaveBeenCalledWith({
      data,
      include: { legislation: true },
    });
  });

  it('updates a link', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'link-1' });
    const readAt = new Date('2026-11-03T00:00:00.000Z');

    await build({ update }).update('link-1', { readAt });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'link-1' },
      data: { readAt },
      include: { legislation: true },
    });
  });

  it('deletes a link', async () => {
    const del = jest.fn().mockResolvedValue({});

    await expect(
      build({ delete: del }).delete('link-1'),
    ).resolves.toBeUndefined();
    expect(del).toHaveBeenCalledWith({ where: { id: 'link-1' } });
  });
});
