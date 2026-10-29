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

  it('rejects an impossible calendar date', () => {
    const { errors } = validate(
      buildPayload({ expiration_date: '2030-02-30T00:00:00.000Z' }),
    );

    expect(errors.map((error) => error.property)).toContain('expiration_date');
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

  describe('conditions', () => {
    const uuid = '0197f7b4-6f3e-7a9b-8c3d-1a2b3c4d5e6f';

    it('defaults to an empty list when the field is absent', () => {
      const { dto, errors } = validate(buildPayload());

      expect(dto.conditions).toEqual([]);
      expect(errors).toHaveLength(0);
    });

    it('parses the JSON string sent in the multipart body', () => {
      const { dto, errors } = validate(
        buildPayload({
          conditions: JSON.stringify([
            {
              condition_id: uuid,
              fulfilled: true,
              copy_to_new: true,
              new_due_date: '2027-10-01',
            },
            { condition_id: uuid, fulfilled: false },
          ]),
        }),
      );

      expect(errors).toHaveLength(0);
      expect(dto.conditions).toHaveLength(2);
      expect(dto.conditions[0].new_due_date).toBe('2027-10-01');
    });

    it('rejects malformed JSON', () => {
      const { errors } = validate(buildPayload({ conditions: '{not json' }));

      expect(errors.map((error) => error.property)).toContain('conditions');
    });

    it('rejects JSON that is not an array', () => {
      const { errors } = validate(buildPayload({ conditions: '{"a":1}' }));

      expect(errors.map((error) => error.property)).toContain('conditions');
    });

    it('accepts an already parsed array', () => {
      const { errors } = validate(
        buildPayload({
          conditions: [{ condition_id: uuid, fulfilled: true }],
        }),
      );

      expect(errors).toHaveLength(0);
    });

    it('requires new_due_date when the condition is copied', () => {
      const { errors } = validate(
        buildPayload({
          conditions: JSON.stringify([
            { condition_id: uuid, fulfilled: true, copy_to_new: true },
          ]),
        }),
      );

      expect(errors.map((error) => error.property)).toContain('conditions');
    });

    it.each(['2027-02-30', '2027', '2027-10', '2027-10-01T00:00:00.000Z'])(
      'rejects %p as the new due date of a copied condition',
      (newDueDate) => {
        const { errors } = validate(
          buildPayload({
            conditions: JSON.stringify([
              {
                condition_id: uuid,
                fulfilled: true,
                copy_to_new: true,
                new_due_date: newDueDate,
              },
            ]),
          }),
        );

        expect(errors.map((error) => error.property)).toContain('conditions');
      },
    );

    it('rejects an item without a valid condition_id or fulfilled flag', () => {
      const { errors } = validate(
        buildPayload({
          conditions: JSON.stringify([{ condition_id: 'x', fulfilled: 'yes' }]),
        }),
      );

      expect(errors.map((error) => error.property)).toContain('conditions');
    });
  });
});
