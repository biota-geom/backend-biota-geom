import { LicenseType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateLicenseDto } from './create-license.dto';

function buildPayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    type: LicenseType.LO,
    process_number: 'LO nº 118/2020',
    issuing_agency_id: '550e8400-e29b-41d4-a716-446655440000',
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

  it('rejects an unknown license type', () => {
    const { errors } = validate(buildPayload({ type: 'LX' }));

    expect(errors.map((error) => error.property)).toContain('type');
  });

  it('rejects a missing process_number', () => {
    const payload = buildPayload();
    delete payload.process_number;

    expect(validate(payload).errors.map((error) => error.property)).toContain(
      'process_number',
    );
  });

  it('rejects an issuing_agency_id that is not a uuid', () => {
    const { errors } = validate(
      buildPayload({ issuing_agency_id: 'not-a-uuid' }),
    );

    expect(errors.map((error) => error.property)).toContain(
      'issuing_agency_id',
    );
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
