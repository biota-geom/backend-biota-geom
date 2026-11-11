import {
  LegislationImpact,
  LegislationType,
  LicenseLegislationSource,
} from '@prisma/client';
import { LicenseLegislation } from '../../domain/license-legislation.entity';
import { toLicenseLegislationResponse } from './license-legislation-response.dto';

const createdAt = new Date('2026-11-02T12:00:00.000Z');

function link(fields: Partial<LicenseLegislation> = {}): LicenseLegislation {
  return {
    id: 'link-1',
    licenseId: 'license-1',
    legislationId: 'legislation-1',
    source: LicenseLegislationSource.SCAN,
    citedExcerpt: '…conforme a Lei nº 12.305/2010…',
    impact: LegislationImpact.HIGH,
    technicalAnalysis: null,
    readAt: null,
    createdAt,
    updatedAt: createdAt,
    legislation: {
      id: 'legislation-1',
      type: LegislationType.LEI,
      number: '12.305',
      year: 2010,
      issuingBody: 'Governo Federal',
      summary: 'Institui a Política Nacional de Resíduos Sólidos.',
      createdAt,
      updatedAt: createdAt,
    },
    ...fields,
  };
}

describe('toLicenseLegislationResponse', () => {
  it('maps a radar entry to the contract', () => {
    expect(toLicenseLegislationResponse(link())).toEqual({
      id: 'link-1',
      legislation: {
        id: 'legislation-1',
        type: 'LEI',
        number: '12.305',
        year: 2010,
        issuing_body: 'Governo Federal',
        summary: 'Institui a Política Nacional de Resíduos Sólidos.',
      },
      source: 'SCAN',
      cited_excerpt: '…conforme a Lei nº 12.305/2010…',
      impact: 'HIGH',
      technical_analysis: null,
      read_at: null,
      created_at: '2026-11-02T12:00:00.000Z',
    });
  });

  it('serializes the read date', () => {
    const readAt = new Date('2026-11-05T08:30:00.000Z');

    expect(toLicenseLegislationResponse(link({ readAt })).read_at).toBe(
      '2026-11-05T08:30:00.000Z',
    );
  });
});
