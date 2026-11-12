import { LegislationType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaLegislationRepository } from './prisma-legislation.repository';

const IDENTITY = {
  type: LegislationType.LEI,
  number: '12.305',
  year: 2010,
  issuingBody: 'Governo Federal',
};

describe('PrismaLegislationRepository', () => {
  it('searches by number and summary and limits the catalog to ten results', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const repository = new PrismaLegislationRepository({
      legislation: { findMany },
    } as unknown as PrismaService);

    await expect(repository.findAllBySearch('12.305')).resolves.toEqual([]);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { number: { contains: '12.305', mode: 'insensitive' } },
          { summary: { contains: '12.305', mode: 'insensitive' } },
        ],
      },
      take: 10,
    });
  });

  it('also searches by an exact year', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const repository = new PrismaLegislationRepository({
      legislation: { findMany },
    } as unknown as PrismaService);

    await repository.findAllBySearch('1997');

    expect(findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { number: { contains: '1997', mode: 'insensitive' } },
          { summary: { contains: '1997', mode: 'insensitive' } },
          { year: { equals: 1997 } },
        ],
      },
      take: 10,
    });
  });

  it('finds a legislation by id', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'legislation-1' });
    const repository = new PrismaLegislationRepository({
      legislation: { findUnique },
    } as unknown as PrismaService);

    await expect(repository.findById('legislation-1')).resolves.toEqual({
      id: 'legislation-1',
    });
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'legislation-1' } });
  });

  it('finds a legislation by its (type, number, year) identity', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const repository = new PrismaLegislationRepository({
      legislation: { findUnique },
    } as unknown as PrismaService);

    await expect(repository.findByIdentity(IDENTITY)).resolves.toBeNull();
    expect(findUnique).toHaveBeenCalledWith({
      where: { type_number_year_issuingBody: IDENTITY },
    });
  });

  it('upserts without touching the existing row', async () => {
    const upsert = jest.fn().mockResolvedValue({ id: 'legislation-1' });
    const repository = new PrismaLegislationRepository({
      legislation: { upsert },
    } as unknown as PrismaService);
    const data = { ...IDENTITY, summary: null };

    await expect(repository.findOrCreate(data)).resolves.toEqual({
      id: 'legislation-1',
    });
    expect(upsert).toHaveBeenCalledWith({
      where: { type_number_year_issuingBody: IDENTITY },
      create: data,
      update: {},
    });
  });
});
