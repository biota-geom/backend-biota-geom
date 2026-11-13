import {
  LegislationImpact,
  LegislationType,
  LicenseLegislationSource,
} from '@prisma/client';
import { ListLicenseLegislationsUseCase } from '../application/list-license-legislations.use-case';
import { UpdateLicenseLegislationUseCase } from '../application/update-license-legislation.use-case';
import { LicenseLegislationsController } from './license-legislations.controller';

function link(overrides: Record<string, unknown> = {}) {
  return {
    id: 'link-1',
    source: LicenseLegislationSource.MANUAL,
    citedExcerpt: null,
    impact: null,
    technicalAnalysis: null,
    readAt: null,
    createdAt: new Date('2026-11-02T12:00:00.000Z'),
    legislation: {
      id: 'legislation-1',
      type: LegislationType.DECRETO,
      number: '7.404',
      year: 2010,
      issuingBody: 'Governo Federal',
      summary: null,
    },
    ...overrides,
  };
}

function build(list = jest.fn(), update = jest.fn()) {
  return new LicenseLegislationsController(
    { execute: list } as unknown as ListLicenseLegislationsUseCase,
    { execute: update } as unknown as UpdateLicenseLegislationUseCase,
  );
}

describe('LicenseLegislationsController', () => {
  it("returns the license radar in the contract's shape", async () => {
    const execute = jest.fn().mockResolvedValue([link()]);
    const controller = build(execute);

    await expect(
      controller.listLicenseLegislations('license-1', {}, { id: 'owner-1' }),
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
    expect(execute).toHaveBeenCalledWith('license-1', 'owner-1', {
      impact: undefined,
    });
  });

  it('forwards the impact filter', async () => {
    const execute = jest.fn().mockResolvedValue([]);
    const controller = build(execute);

    await controller.listLicenseLegislations(
      'license-1',
      { impact: LegislationImpact.HIGH },
      { id: 'owner-1' },
    );
    expect(execute).toHaveBeenCalledWith('license-1', 'owner-1', {
      impact: LegislationImpact.HIGH,
    });
  });

  it('updates impact/read and serializes the result', async () => {
    const readAt = new Date('2026-11-12T15:00:00.000Z');
    const update = jest
      .fn()
      .mockResolvedValue(link({ impact: LegislationImpact.LOW, readAt }));
    const controller = build(jest.fn(), update);

    await expect(
      controller.updateLicenseLegislation(
        'license-1',
        'link-1',
        { impact: LegislationImpact.LOW, read: true },
        { id: 'owner-1' },
      ),
    ).resolves.toMatchObject({
      id: 'link-1',
      impact: 'LOW',
      read_at: '2026-11-12T15:00:00.000Z',
    });
    expect(update).toHaveBeenCalledWith({
      licenseId: 'license-1',
      id: 'link-1',
      ownerUserId: 'owner-1',
      impact: LegislationImpact.LOW,
      read: true,
    });
  });
});
