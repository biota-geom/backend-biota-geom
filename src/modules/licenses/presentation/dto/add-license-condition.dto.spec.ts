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
    esg_metric_id: '0192f0a4-7c1e-7d3a-9b2f-3a1c5e8d9f01',
    license_id: '550e8400-e29b-41d4-a716-446655440000',
    responsible_agency: 'FEPAM',
    due_date: '2027-05-20T00:00:00.000Z',
    status: LicenseConditionStatusDto.REGULAR,
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

  afterEach(() => {
    jest.useRealTimers();
  });

  it('accepts and trims a complete payload', () => {
    const { dto, errors } = validate(
      payload({ name: '  MTR  ', responsible_agency: '  FEPAM  ' }),
    );

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('MTR');
    expect(dto.responsible_agency).toBe('FEPAM');
  });

  it('accepts an omitted status and description', () => {
    const value: Record<string, unknown> = payload();
    delete value.status;
    delete value.description;

    expect(validate(value).errors).toHaveLength(0);
  });

  it('keeps non-string values unchanged so string validation can reject them', () => {
    const { dto, errors } = validate(payload({ name: 123 }));

    expect(dto.name).toBe(123);
    expect(errors.map((error) => error.property)).toContain('name');
  });

  it('maps an explicit status and preserves an omitted status', () => {
    expect(toLicenseConditionStatus(undefined)).toBeUndefined();
    expect(toLicenseConditionStatus(LicenseConditionStatusDto.ATTENTION)).toBe(
      LicenseConditionStatus.ATTENTION,
    );
  });

  it.each(['name', 'responsible_agency'])('rejects an empty %s', (field) => {
    expect(
      validate(payload({ [field]: '   ' })).errors.map(
        (error) => error.property,
      ),
    ).toContain(field);
  });

  it.each(['not-a-uuid', undefined])(
    'rejects a missing or malformed esg_metric_id (%s)',
    (esgMetricId) => {
      expect(
        validate(payload({ esg_metric_id: esgMetricId })).errors.map(
          (error) => error.property,
        ),
      ).toContain('esg_metric_id');
    },
  );

  it('rejects a malformed license_id', () => {
    expect(
      validate(payload({ license_id: 'not-a-uuid' })).errors.map(
        (error) => error.property,
      ),
    ).toContain('license_id');
  });

  it('rejects a malformed or non-future due_date', () => {
    for (const dueDate of ['20/05/2027', '2026-09-29T11:00:00.000Z']) {
      expect(
        validate(payload({ due_date: dueDate })).errors.map(
          (error) => error.property,
        ),
      ).toContain('due_date');
    }
  });

  it('rejects an unknown status', () => {
    expect(
      validate(payload({ status: 'Vencida' })).errors.map(
        (error) => error.property,
      ),
    ).toContain('status');
  });
});
