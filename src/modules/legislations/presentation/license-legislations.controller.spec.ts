import { LegislationType, LicenseLegislationSource } from '@prisma/client';
import { ListLicenseLegislationsUseCase } from '../application/list-license-legislations.use-case';
import { LicenseLegislationsController } from './license-legislations.controller';

describe('LicenseLegislationsController', () => {
  it("returns the license radar in the contract's shape", async () => {
    const createdAt = new Date('2026-11-02T12:00:00.000Z');
    const execute = jest.fn().mockResolvedValue([
      {
        id: 'link-1',
        source: LicenseLegislationSource.MANUAL,
        citedExcerpt: null,
        impact: null,
        technicalAnalysis: null,
        readAt: null,
        createdAt,
        legislation: {
          id: 'legislation-1',
          type: LegislationType.DECRETO,
          number: '7.404',
          year: 2010,
          issuingBody: 'Governo Federal',
          summary: null,
        },
      },
    ]);
    const controller = new LicenseLegislationsController({
      execute,
    } as unknown as ListLicenseLegislationsUseCase);

    await expect(
      controller.listLicenseLegislations('license-1', { id: 'owner-1' }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'link-1',
        source: 'MANUAL',
        legislation: expect.objectContaining({
          type: 'DECRETO',
          issuing_body: 'Governo Federal',
        }) as unknown,
      }),
    ]);
    expect(execute).toHaveBeenCalledWith('license-1', 'owner-1');
  });
});
