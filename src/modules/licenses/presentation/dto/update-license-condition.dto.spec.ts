import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateLicenseConditionDto } from './update-license-condition.dto';

function buildPayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    title: 'MTR - Manifesto de Transporte de Resíduos',
    description: 'Emissão de manifesto obrigatório.',
    category: 'Resíduos',
    license_id: '550e8400-e29b-41d4-a716-446655440000',
    due_date: '2026-06-30T00:00:00.000Z',
    ...overrides,
  };
}

function validate(payload: Record<string, unknown>): {
  dto: UpdateLicenseConditionDto;
  errors: ReturnType<typeof validateSync>;
} {
  const dto = plainToInstance(UpdateLicenseConditionDto, payload);

  return { dto, errors: validateSync(dto, { whitelist: true }) };
}

describe('UpdateLicenseConditionDto', () => {
  it('accepts a well-formed payload', () => {
    expect(validate(buildPayload()).errors).toHaveLength(0);
  });

  it('trims surrounding whitespace on the text fields', () => {
    const { dto } = validate(
      buildPayload({
        title: '  MTR  ',
        description: '  Emissão de manifesto.  ',
        category: '  Resíduos  ',
      }),
    );

    expect(dto.title).toBe('MTR');
    expect(dto.description).toBe('Emissão de manifesto.');
    expect(dto.category).toBe('Resíduos');
  });

  it('leaves a non-string title untouched for the validator to reject', () => {
    const { dto, errors } = validate(buildPayload({ title: 42 }));

    expect(dto.title).toBe(42);
    expect(errors.map((error) => error.property)).toContain('title');
  });

  it('rejects a title made only of whitespace', () => {
    const { errors } = validate(buildPayload({ title: '   ' }));

    expect(errors.map((error) => error.property)).toContain('title');
  });

  it('rejects a missing description', () => {
    const payload = buildPayload();
    delete payload.description;

    expect(validate(payload).errors.map((error) => error.property)).toContain(
      'description',
    );
  });

  it('rejects a missing category', () => {
    const payload = buildPayload();
    delete payload.category;

    expect(validate(payload).errors.map((error) => error.property)).toContain(
      'category',
    );
  });

  it('rejects a license_id that is not a uuid', () => {
    const { errors } = validate(buildPayload({ license_id: 'not-a-uuid' }));

    expect(errors.map((error) => error.property)).toContain('license_id');
  });

  it('rejects a malformed due_date', () => {
    const { errors } = validate(buildPayload({ due_date: '30/06/2026' }));

    expect(errors.map((error) => error.property)).toContain('due_date');
  });

  it('rejects values longer than the columns they are stored in', () => {
    const { errors } = validate(
      buildPayload({
        title: 'a'.repeat(161),
        description: 'b'.repeat(501),
        category: 'c'.repeat(121),
      }),
    );

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['title', 'description', 'category']),
    );
  });
});
