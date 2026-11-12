import { LegislationType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AddLicenseLegislationDto } from './add-license-legislation.dto';
import { toLegislationData } from './legislation-input.dto';
import { UpdateLicenseLegislationDto } from './update-license-legislation.dto';

const LEGISLATION = {
  type: LegislationType.LEI,
  number: ' 12.305 ',
  year: 2010,
  issuing_body: ' Governo Federal ',
  summary: '  ',
};

function validate<T extends object>(
  cls: new () => T,
  value: Record<string, unknown>,
) {
  const dto = plainToInstance(cls, value);
  return { dto, errors: validateSync(dto, { forbidNonWhitelisted: true }) };
}

describe('AddLicenseLegislationDto', () => {
  it('accepts the act data, trimming text and blanking empty fields', () => {
    const { dto, errors } = validate(AddLicenseLegislationDto, {
      legislation: LEGISLATION,
      cited_excerpt: '   ',
    });

    expect(errors).toHaveLength(0);
    expect(dto.cited_excerpt).toBeNull();
    expect(toLegislationData(dto.legislation!)).toEqual({
      type: LegislationType.LEI,
      number: '12.305',
      year: 2010,
      issuingBody: 'Governo Federal',
      summary: null,
    });
  });

  it('accepts a catalog act id', () => {
    const { errors } = validate(AddLicenseLegislationDto, {
      legislation_id: '0194f7b6-3c4e-7a1b-8c2d-123456789abc',
      cited_excerpt: null,
    });

    expect(errors).toHaveLength(0);
  });

  it.each([
    ['an unknown type', { type: 'LEI_COMPLEMENTAR' }],
    ['a blank number', { number: '   ' }],
    ['a missing year', { year: undefined }],
    ['a non-integer year', { year: 2010.5 }],
    ['an implausible year', { year: 99 }],
  ])('rejects %s', (_, override) => {
    const { errors } = validate(AddLicenseLegislationDto, {
      legislation: { ...LEGISLATION, ...override },
    });

    expect(errors).not.toHaveLength(0);
  });

  it('rejects a malformed catalog id', () => {
    const { errors } = validate(AddLicenseLegislationDto, {
      legislation_id: 'not-a-uuid',
    });

    expect(errors).not.toHaveLength(0);
  });
});

describe('toLegislationData', () => {
  it('stores an act without issuing body or summary with empty defaults', () => {
    expect(
      toLegislationData({
        type: LegislationType.DECRETO,
        number: '7.404',
        year: 2010,
      }),
    ).toEqual({
      type: LegislationType.DECRETO,
      number: '7.404',
      year: 2010,
      issuingBody: '',
      summary: null,
    });
  });
});

describe('UpdateLicenseLegislationDto', () => {
  it('accepts an empty body', () => {
    const { dto, errors } = validate(UpdateLicenseLegislationDto, {});

    expect(errors).toHaveLength(0);
    expect(dto.cited_excerpt).toBeUndefined();
  });

  it('accepts a new excerpt and act data', () => {
    const { dto, errors } = validate(UpdateLicenseLegislationDto, {
      cited_excerpt: ' art. 3º ',
      legislation: LEGISLATION,
    });

    expect(errors).toHaveLength(0);
    expect(dto.cited_excerpt).toBe('art. 3º');
  });

  it('rejects invalid act data', () => {
    const { errors } = validate(UpdateLicenseLegislationDto, {
      legislation: { ...LEGISLATION, number: '' },
    });

    expect(errors).not.toHaveLength(0);
  });
});
