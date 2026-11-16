import { LegislationType, LicenseLegislationSource } from '@prisma/client';
import { AddLicenseLegislationsUseCase } from '../application/add-license-legislations.use-case';
import { ListLicenseLegislationsUseCase } from '../application/list-license-legislations.use-case';
import { CreateLicenseLegislationsDto } from './dto/create-license-legislations.dto';
import { RemoveLicenseLegislationUseCase } from '../application/remove-license-legislation.use-case';
import { UpdateLicenseLegislationUseCase } from '../application/update-license-legislation.use-case';
import { LicenseLegislationsController } from './license-legislations.controller';
import { AddLicenseLegislationUseCase } from '../application/add-license-legislation.use-case';

const LINK = {
  id: 'link-1',
  source: LicenseLegislationSource.MANUAL,
  citedExcerpt: null,
  impact: null,
  technicalAnalysis: null,
  readAt: null,
  createdAt: new Date('2026-11-02T12:00:00.000Z'),
  legislation: {
    id: 'legislation-1',
    type: LegislationType.LEI,
    number: '12.305',
    year: 2010,
    issuingBody: '',
    summary: null,
  },
};

function buildController({
  list = jest.fn(),
  add = jest.fn().mockResolvedValue(LINK),
  addBatch = jest.fn().mockResolvedValue([LINK]),
  update = jest.fn().mockResolvedValue(LINK),
  remove = jest.fn().mockResolvedValue(undefined),
}: Record<string, jest.Mock> = {}) {
  return new LicenseLegislationsController(
    { execute: list } as unknown as ListLicenseLegislationsUseCase,
    { execute: add } as unknown as AddLicenseLegislationUseCase,
    { execute: addBatch } as unknown as AddLicenseLegislationsUseCase,
    { execute: update } as unknown as UpdateLicenseLegislationUseCase,
    { execute: remove } as unknown as RemoveLicenseLegislationUseCase,
  );
}

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
      {} as AddLicenseLegislationUseCase,
      {} as AddLicenseLegislationsUseCase,
      {} as UpdateLicenseLegislationUseCase,
      {} as RemoveLicenseLegislationUseCase,
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
      {} as AddLicenseLegislationUseCase,
      { execute } as unknown as AddLicenseLegislationsUseCase,
      {} as UpdateLicenseLegislationUseCase,
      {} as RemoveLicenseLegislationUseCase,
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

  it('adds an act from its data', async () => {
    const add = jest.fn().mockResolvedValue(LINK);
    const controller = buildController({ add });

    await expect(
      controller.addLicenseLegislation(
        'license-1',
        {
          legislation: {
            type: LegislationType.LEI,
            number: '12.305',
            year: 2010,
            issuing_body: 'Governo Federal',
          },
          cited_excerpt: null,
        },
        { id: 'owner-1' },
      ),
    ).resolves.toEqual(
      expect.objectContaining({ id: 'link-1', source: 'MANUAL' }),
    );
    expect(add).toHaveBeenCalledWith('license-1', 'owner-1', {
      legislationId: undefined,
      legislation: {
        type: LegislationType.LEI,
        number: '12.305',
        year: 2010,
        issuingBody: 'Governo Federal',
        summary: null,
      },
      citedExcerpt: null,
    });
  });

  it('adds a catalog act by id', async () => {
    const add = jest.fn().mockResolvedValue(LINK);
    const controller = buildController({ add });

    await controller.addLicenseLegislation(
      'license-1',
      { legislation_id: 'legislation-1' },
      { id: 'owner-1' },
    );
    expect(add).toHaveBeenCalledWith('license-1', 'owner-1', {
      legislationId: 'legislation-1',
      legislation: undefined,
      citedExcerpt: undefined,
    });
  });

  it('updates a radar entry', async () => {
    const update = jest.fn().mockResolvedValue(LINK);
    const controller = buildController({ update });

    await expect(
      controller.updateLicenseLegislation(
        'license-1',
        'link-1',
        { cited_excerpt: 'art. 3º' },
        { id: 'owner-1' },
      ),
    ).resolves.toEqual(expect.objectContaining({ id: 'link-1' }));
    expect(update).toHaveBeenCalledWith('license-1', 'link-1', 'owner-1', {
      citedExcerpt: 'art. 3º',
      legislation: undefined,
    });
  });

  it('removes a radar entry', async () => {
    const remove = jest.fn().mockResolvedValue(undefined);
    const controller = buildController({ remove });

    await expect(
      controller.removeLicenseLegislation('license-1', 'link-1', {
        id: 'owner-1',
      }),
    ).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledWith('license-1', 'link-1', 'owner-1');
  });
});
