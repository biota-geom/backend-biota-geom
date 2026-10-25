import { LicenseConditionStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  AddLicenseConditionDto,
  LicenseConditionStatusDto,
  toLicenseConditionStatus,
} from './add-license-condition.dto';

function payload(overrides: Record<string, unknown> = {}) {
  return {
    name: 'MTR - Manifesto de Transporte de Resíduos',
    environmental_descriptor: 'Resíduos sólidos',
    license_id: '550e8400-e29b-41d4-a716-446655440000',
    responsible_agency: 'FEPAM',
    due_date: '2027-05-20T00:00:00.000Z',
    status: LicenseConditionStatusDto.REGULAR,
    has_delivery: true,
    description: 'Manifesto de transporte.',
    ...overrides,
  };
}

function validate(value: Record<string, unknown>) {
  const dto = plainToInstance(AddLicenseConditionDto, value);
  return { dto, errors: validateSync(dto) };
}

describe('AddLicenseConditionDto', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-29T12:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('accepts and trims descriptor text', () => {
    const { dto, errors } = validate(
      payload({ environmental_descriptor: '  Resíduos sólidos  ' }),
    );
    expect(errors).toHaveLength(0);
    expect(dto.environmental_descriptor).toBe('Resíduos sólidos');
  });

  it.each(['name', 'environmental_descriptor', 'responsible_agency'])(
    'rejects an empty %s',
    (field) => {
      expect(
        validate(payload({ [field]: '   ' })).errors.map(
          (error) => error.property,
        ),
      ).toContain(field);
    },
  );

  it('validates license, due date and delivery types', () => {
    const properties = validate(
      payload({
        license_id: 'invalid',
        due_date: '20/05/2027',
        has_delivery: 'yes',
      }),
    ).errors.map((error) => error.property);

    expect(properties).toEqual(
      expect.arrayContaining(['license_id', 'due_date', 'has_delivery']),
    );
  });

  it('accepts and ignores legacy numbering and compliance-target fields', () => {
    expect(
      validate(
        payload({
          item_number: '99.4',
          target_metric_id: 'legacy',
          target_operator: 'legacy',
          target_value: 'legacy',
        }),
      ).errors,
    ).toHaveLength(0);
  });

  it('maps an explicit status and preserves an omitted status', () => {
    expect(toLicenseConditionStatus(undefined)).toBeUndefined();
    expect(toLicenseConditionStatus(LicenseConditionStatusDto.ATTENTION)).toBe(
      LicenseConditionStatus.ATTENTION,
    );
  });
});
