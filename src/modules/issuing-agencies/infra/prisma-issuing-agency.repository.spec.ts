import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaIssuingAgencyRepository } from './prisma-issuing-agency.repository';

function buildRepository(issuingAgency: {
  findMany?: jest.Mock;
  findUnique?: jest.Mock;
}): PrismaIssuingAgencyRepository {
  return new PrismaIssuingAgencyRepository({
    issuingAgency,
  } as unknown as PrismaService);
}

describe('PrismaIssuingAgencyRepository', () => {
  it('lists issuing agencies alphabetically so the dropdown reads predictably', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'agency-1' }]);

    await expect(buildRepository({ findMany }).findAll()).resolves.toEqual([
      { id: 'agency-1' },
    ]);
    expect(findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
  });

  it('reports an existing issuing agency as present', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'agency-1' });

    await expect(
      buildRepository({ findUnique }).existsById('agency-1'),
    ).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'agency-1' },
      select: { id: true },
    });
  });

  it('reports a missing issuing agency as absent', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);

    await expect(
      buildRepository({ findUnique }).existsById('missing'),
    ).resolves.toBe(false);
  });
});
