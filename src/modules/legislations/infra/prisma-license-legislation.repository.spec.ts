import { LicenseLegislationSource, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { LegislationAlreadyLinkedError } from '../domain/errors/legislation-already-linked.error';
import { PrismaLicenseLegislationRepository } from './prisma-license-legislation.repository';

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('failed', {
    code,
    clientVersion: 'test',
  });
}

function build(model: Record<string, jest.Mock>) {
  return new PrismaLicenseLegislationRepository({
    licenseLegislation: model,
  } as unknown as PrismaService);
}

describe('PrismaLicenseLegislationRepository', () => {
  it('lists a license radar by legislation year, most recent first', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'link-1' }]);

    await expect(
      build({ findMany }).findAllByLicenseId('license-1'),
    ).resolves.toEqual([{ id: 'link-1' }]);
    expect(findMany).toHaveBeenCalledWith({
      where: { licenseId: 'license-1' },
      include: { legislation: true },
      orderBy: [
        { legislation: { year: 'desc' } },
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
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

  it('finds the link between a license and an act', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);

    await expect(
      build({ findUnique }).findByLicenseAndLegislation(
        'license-1',
        'legislation-1',
      ),
    ).resolves.toBeNull();
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        licenseId_legislationId: {
          licenseId: 'license-1',
          legislationId: 'legislation-1',
        },
      },
      include: { legislation: true },
    });
  });

  it('counts the licenses citing an act', async () => {
    const count = jest.fn().mockResolvedValue(2);

    await expect(
      build({ count }).countByLegislationId('legislation-1'),
    ).resolves.toBe(2);
    expect(count).toHaveBeenCalledWith({
      where: { legislationId: 'legislation-1' },
    });
  });

  it('turns a duplicated link on create into a domain error', async () => {
    const create = jest.fn().mockRejectedValue(prismaError('P2002'));

    await expect(
      build({ create }).create({
        licenseId: 'license-1',
        legislationId: 'legislation-1',
        source: LicenseLegislationSource.MANUAL,
      }),
    ).rejects.toThrow(LegislationAlreadyLinkedError);
  });

  it('turns a duplicated relink on update into a domain error', async () => {
    const update = jest.fn().mockRejectedValue(prismaError('P2002'));

    await expect(
      build({ update }).update('link-1', { legislationId: 'legislation-2' }),
    ).rejects.toThrow(LegislationAlreadyLinkedError);
  });

  it('rethrows any other database error', async () => {
    const failure = prismaError('P2025');
    const create = jest.fn().mockRejectedValue(failure);
    const update = jest.fn().mockRejectedValue(failure);
    const repository = build({ create, update });

    await expect(
      repository.create({
        licenseId: 'license-1',
        legislationId: 'legislation-1',
        source: LicenseLegislationSource.MANUAL,
      }),
    ).rejects.toBe(failure);
    await expect(
      repository.update('link-1', { citedExcerpt: null }),
    ).rejects.toBe(failure);
  });
});
