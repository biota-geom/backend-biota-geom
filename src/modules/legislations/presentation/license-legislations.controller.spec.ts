import { LegislationType, LicenseLegislationSource } from '@prisma/client';
import { AddLicenseLegislationsUseCase } from '../application/add-license-legislations.use-case';
import { ListLicenseLegislationsUseCase } from '../application/list-license-legislations.use-case';
import { CreateLicenseLegislationsDto } from './dto/create-license-legislations.dto';
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
    const controller = new LicenseLegislationsController(
      { execute } as unknown as ListLicenseLegislationsUseCase,
      {} as AddLicenseLegislationsUseCase,
    );

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

  it('maps batch input and returned links to the API response shape', async () => {
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
          type: LegislationType.LEI,
          number: '12.305',
          year: 2010,
          issuingBody: 'Governo Federal',
          summary: null,
        },
      },
    ]);
    const controller = new LicenseLegislationsController(
      {} as ListLicenseLegislationsUseCase,
      { execute } as unknown as AddLicenseLegislationsUseCase,
    );
    const body = Object.assign(new CreateLicenseLegislationsDto(), {
      legislations: [
        {
          toDomain: () => ({
            legislationId: 'legislation-1',
            source: LicenseLegislationSource.MANUAL,
          }),
        },
      ],
      toDomain: () => [
        {
          legislationId: 'legislation-1',
          source: LicenseLegislationSource.MANUAL,
        },
      ],
    });

    await expect(
      controller.addLicenseLegislations('license-1', { id: 'owner-1' }, body),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'link-1',
        source: 'MANUAL',
        legislation: expect.objectContaining({
          number: '12.305',
        }) as unknown,
      }),
    ]);
    expect(execute).toHaveBeenCalledWith('license-1', 'owner-1', [
      {
        legislationId: 'legislation-1',
        source: LicenseLegislationSource.MANUAL,
      },
    ]);
  });
});
