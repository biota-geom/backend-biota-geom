import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateLicenseDto } from './create-license.dto';

function buildPayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    type: 'LO',
    process_number: 'LO nº 118/2020',
    issuing_agency: 'FEPAM',
    issue_date: '2020-01-10T00:00:00.000Z',
    expiration_date: '2025-01-10T00:00:00.000Z',
    ...overrides,
  };
}

function validate(payload: Record<string, unknown>): {
  dto: CreateLicenseDto;
  errors: ReturnType<typeof validateSync>;
} {
  const dto = plainToInstance(CreateLicenseDto, payload);

  return { dto, errors: validateSync(dto, { whitelist: true }) };
}

/*
 * type e issuing_agency são texto livre (issue #88) e seguem as mesmas
 * regras; só o limite de caracteres muda, acompanhando o VARCHAR do banco.
 */
const freeTextFields = [
  { field: 'type', sample: 'LAO', maxLength: 50 },
  {
    field: 'issuing_agency',
    sample: 'Secretaria Municipal do Meio Ambiente',
    maxLength: 150,
  },
] as const;

describe('CreateLicenseDto', () => {
  it('accepts a well-formed payload', () => {
    expect(validate(buildPayload()).errors).toHaveLength(0);
  });

  it('trims surrounding whitespace on process_number', () => {
    const { dto } = validate(
      buildPayload({ process_number: '  LO nº 118/2020  ' }),
    );

    expect(dto.process_number).toBe('LO nº 118/2020');
  });

  it('leaves a non-string process_number untouched for the validator to reject', () => {
    const { dto, errors } = validate(buildPayload({ process_number: 42 }));

    expect(dto.process_number).toBe(42);
    expect(errors.map((error) => error.property)).toContain('process_number');
  });

  it('rejects a missing process_number', () => {
    const payload = buildPayload();
    delete payload.process_number;

    expect(validate(payload).errors.map((error) => error.property)).toContain(
      'process_number',
    );
  });

  describe.each(freeTextFields)('$field', ({ field, sample, maxLength }) => {
    it('accepts free text outside the old fixed list', () => {
      expect(validate(buildPayload({ [field]: sample })).errors).toHaveLength(
        0,
      );
    });

    it('trims surrounding whitespace', () => {
      const { dto } = validate(buildPayload({ [field]: `  ${sample}  ` }));

      expect(dto[field]).toBe(sample);
    });

    it('rejects a whitespace-only value', () => {
      const { errors } = validate(buildPayload({ [field]: '   ' }));

      expect(errors.map((error) => error.property)).toContain(field);
    });

    it('rejects a missing value', () => {
      const payload = buildPayload();
      delete payload[field];

      expect(validate(payload).errors.map((error) => error.property)).toContain(
        field,
      );
    });

    it(`accepts exactly ${maxLength} characters`, () => {
      expect(
        validate(buildPayload({ [field]: 'A'.repeat(maxLength) })).errors,
      ).toHaveLength(0);
    });

    it(`rejects ${maxLength + 1} characters`, () => {
      const { errors } = validate(
        buildPayload({ [field]: 'A'.repeat(maxLength + 1) }),
      );

      expect(errors.map((error) => error.property)).toContain(field);
    });
  });

  it('rejects a malformed issue_date', () => {
    const { errors } = validate(buildPayload({ issue_date: '10/01/2020' }));

    expect(errors.map((error) => error.property)).toContain('issue_date');
  });

  it('rejects a malformed expiration_date', () => {
    const { errors } = validate(
      buildPayload({ expiration_date: 'not-a-date' }),
    );

    expect(errors.map((error) => error.property)).toContain('expiration_date');
  });
});
