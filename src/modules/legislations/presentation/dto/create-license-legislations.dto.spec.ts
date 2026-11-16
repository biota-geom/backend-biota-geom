import {
  LegislationImpact,
  LegislationType,
  LicenseLegislationSource,
} from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateLicenseLegislationsDto } from './create-license-legislations.dto';

describe('CreateLicenseLegislationsDto', () => {
  const baseItem = {
    source: LicenseLegislationSource.MANUAL,
  };

  async function validateBody(legislation: Record<string, unknown>) {
    const body = plainToInstance(CreateLicenseLegislationsDto, {
      legislations: [legislation],
    });

    return validate(body);
  }

  it('requires exactly one legislation reference per item', async () => {
    const missing = await validateBody(baseItem);
    const both = await validateBody({
      ...baseItem,
      legislation_id: '00000000-0000-4000-8000-000000000001',
      legislation: {
        type: LegislationType.LEI,
        number: '12.305',
        year: 2010,
        issuing_body: 'Governo Federal',
      },
    });

    expect(missing).not.toHaveLength(0);
    expect(both).not.toHaveLength(0);
  });

  it('accepts a catalog ID or an inline catalog entry', async () => {
    await expect(
      validateBody({
        ...baseItem,
        legislation_id: '00000000-0000-4000-8000-000000000001',
      }),
    ).resolves.toHaveLength(0);
    await expect(
      validateBody({
        ...baseItem,
        legislation: {
          type: LegislationType.LEI,
          number: '12.305',
          year: 2010,
          issuing_body: 'Governo Federal',
        },
      }),
    ).resolves.toHaveLength(0);
  });

  it('rejects an empty batch and invalid inline legislation fields', async () => {
    const emptyBatch = plainToInstance(CreateLicenseLegislationsDto, {
      legislations: [],
    });
    const invalidInline = plainToInstance(CreateLicenseLegislationsDto, {
      legislations: [
        {
          ...baseItem,
          legislation: {
            type: 'INVALID',
            number: '',
            year: '2010',
            issuing_body: '',
          },
        },
      ],
    });

    await expect(validate(emptyBatch)).resolves.not.toHaveLength(0);
    await expect(validate(invalidInline)).resolves.not.toHaveLength(0);
  });

  it('maps catalog references and inline legislation to the domain shape', () => {
    const body = plainToInstance(CreateLicenseLegislationsDto, {
      legislations: [
        {
          legislation_id: '00000000-0000-4000-8000-000000000001',
          source: LicenseLegislationSource.MANUAL,
        },
        {
          legislation: {
            type: LegislationType.RESOLUCAO,
            number: '237',
            year: 1997,
            issuing_body: 'CONAMA',
            summary: 'Licenciamento ambiental.',
          },
          source: LicenseLegislationSource.SCAN,
          cited_excerpt: 'Trecho citado.',
          impact: LegislationImpact.MODERATE,
        },
      ],
    });

    expect(body.toDomain()).toEqual([
      {
        legislationId: '00000000-0000-4000-8000-000000000001',
        legislation: undefined,
        source: LicenseLegislationSource.MANUAL,
        citedExcerpt: undefined,
        impact: undefined,
      },
      {
        legislationId: undefined,
        legislation: {
          type: LegislationType.RESOLUCAO,
          number: '237',
          year: 1997,
          issuingBody: 'CONAMA',
          summary: 'Licenciamento ambiental.',
        },
        source: LicenseLegislationSource.SCAN,
        citedExcerpt: 'Trecho citado.',
        impact: LegislationImpact.MODERATE,
      },
    ]);
  });
});
