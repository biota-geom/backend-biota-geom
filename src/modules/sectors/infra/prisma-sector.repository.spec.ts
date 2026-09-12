import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaSectorRepository } from './prisma-sector.repository';

function buildRepository(sector: {
  findMany?: jest.Mock;
  findUnique?: jest.Mock;
}): PrismaSectorRepository {
  return new PrismaSectorRepository({ sector } as unknown as PrismaService);
}

describe('PrismaSectorRepository', () => {
  it('lists sectors alphabetically so the dropdown reads predictably', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'sector-1' }]);

    await expect(buildRepository({ findMany }).findAll()).resolves.toEqual([
      { id: 'sector-1' },
    ]);
    expect(findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
  });

  it('reports an existing sector as present', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'sector-1' });

    await expect(
      buildRepository({ findUnique }).existsById('sector-1'),
    ).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'sector-1' },
      select: { id: true },
    });
  });

  it('reports a missing sector as absent', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);

    await expect(
      buildRepository({ findUnique }).existsById('missing'),
    ).resolves.toBe(false);
  });
});
