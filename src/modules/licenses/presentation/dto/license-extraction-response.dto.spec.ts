import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateLicenseLegislationsDto } from '../../../legislations/presentation/dto/create-license-legislations.dto';
import {
  LicenseExtraction,
  SuggestedLegislation,
} from '../../domain/license-extraction';
import { toLicenseExtractionResponse } from './license-extraction-response.dto';

const EMPTY_DATA = {
  type: null,
  processNumber: null,
  issuingAgency: null,
  issueDate: null,
  expirationDate: null,
};

function extractionWith(
  suggestedLegislations: SuggestedLegislation[],
): LicenseExtraction {
  return {
    extractedData: EMPTY_DATA,
    suggestedConditions: [],
    suggestedLegislations,
  };
}

function suggestion(
  overrides: Partial<SuggestedLegislation> = {},
): SuggestedLegislation {
  return {
    legislation: {
      type: 'LEI',
      number: '12.305',
      year: 2010,
      issuingBody: 'Governo Federal',
      summary: 'Institui a PNRS.',
    },
    citedExcerpt: '…conforme a Lei nº 12.305/2010…',
    source: 'SCAN',
    impact: 'HIGH',
    ...overrides,
  };
}

describe('toLicenseExtractionResponse (legislations)', () => {
  it('answers suggested_legislations in snake_case, as a SCAN entry', () => {
    const response = toLicenseExtractionResponse(
      extractionWith([suggestion()]),
    );

    expect(response.suggested_legislations).toEqual([
      {
        legislation: {
          type: 'LEI',
          number: '12.305',
          year: 2010,
          issuing_body: 'Governo Federal',
          summary: 'Institui a PNRS.',
        },
        cited_excerpt: '…conforme a Lei nº 12.305/2010…',
        source: 'SCAN',
        impact: 'HIGH',
      },
    ]);
  });

  it('answers an empty list when the license cites nothing', () => {
    expect(
      toLicenseExtractionResponse(extractionWith([])).suggested_legislations,
    ).toEqual([]);
  });

  // The client sends the entries the operator kept straight to the radar's
  // batch route, so the extraction shape must pass that route's validation
  // (same options as the global ValidationPipe) with no remapping.
  it.each([
    ['a complete suggestion', suggestion()],
    [
      'a suggestion without summary, excerpt or impact',
      suggestion({
        citedExcerpt: null,
        impact: null,
        legislation: {
          type: 'RESOLUCAO',
          number: '237',
          year: 1997,
          issuingBody: 'CONAMA',
          summary: null,
        },
      }),
    ],
  ])('is accepted as is by the batch route: %s', (_name, item) => {
    const { suggested_legislations: legislations } =
      toLicenseExtractionResponse(extractionWith([item]));

    const batch = plainToInstance(CreateLicenseLegislationsDto, {
      legislations,
    });

    expect(
      validateSync(batch, { whitelist: true, forbidNonWhitelisted: true }),
    ).toHaveLength(0);
    expect(batch.toDomain()).toEqual([
      expect.objectContaining({
        source: 'SCAN',
        citedExcerpt: item.citedExcerpt,
        impact: item.impact,
        legislation: item.legislation,
      }),
    ]);
  });
});
