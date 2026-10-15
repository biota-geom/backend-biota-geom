import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RenewLicenseDto } from './renew-license.dto';

function buildPayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    process_number: 'LO nº 119/2026',
    issue_date: '2026-01-10T00:00:00.000Z',
    expiration_date: '2030-01-10T00:00:00.000Z',
    ...overrides,
  };
}

function validate(payload: Record<string, unknown>): {
  dto: RenewLicenseDto;
  errors: ReturnType<typeof validateSync>;
} {
  const dto = plainToInstance(RenewLicenseDto, payload);

  return { dto, errors: validateSync(dto, { whitelist: true }) };
}

describe('RenewLicenseDto', () => {
  it('accepts a well-formed payload', () => {
    expect(validate(buildPayload()).errors).toHaveLength(0);
  });

  it('trims surrounding whitespace on process_number', () => {
    const { dto } = validate(
      buildPayload({ process_number: '  LO nº 119/2026  ' }),
    );

    expect(dto.process_number).toBe('LO nº 119/2026');
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

  it('rejects malformed dates', () => {
    expect(
      validate(buildPayload({ issue_date: '10/01/2026' })).errors.map(
        (error) => error.property,
      ),
    ).toContain('issue_date');
    expect(
      validate(buildPayload({ expiration_date: 'not-a-date' })).errors.map(
        (error) => error.property,
      ),
    ).toContain('expiration_date');
  });
});
