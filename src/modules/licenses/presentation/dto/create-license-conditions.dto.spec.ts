import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateLicenseConditionsDto } from './create-license-conditions.dto';

const validCondition = {
  environmental_descriptor: 'Resíduos sólidos',
  description: 'Condition description',
  condition_type: 'PERIODIC',
  periodicity: 'ANNUAL',
  deadline: '2026-12-31T00:00:00.000Z',
  responsible_name: 'Lucas Silva',
  has_delivery: true,
};

function validate(condition: Record<string, unknown>) {
  return validateSync(
    plainToInstance(CreateLicenseConditionsDto, { conditions: [condition] }),
  );
}

describe('CreateLicenseConditionsDto', () => {
  it('accepts a free-text environmental descriptor', () => {
    expect(validate(validCondition)).toHaveLength(0);
  });

  it('accepts a valid parent condition id', () => {
    expect(
      validate({
        ...validCondition,
        parent_condition_id: 'c88b9ecf-464d-4c33-9aa4-a8048bb4765d',
      }),
    ).toHaveLength(0);
  });

  it('rejects an invalid parent condition id', () => {
    expect(
      validate({ ...validCondition, parent_condition_id: 'not-a-uuid' }),
    ).not.toHaveLength(0);
  });

  it('requires the environmental descriptor', () => {
    expect(
      validate({ ...validCondition, environmental_descriptor: '' }),
    ).not.toHaveLength(0);
  });

  it('accepts and ignores a legacy item number', () => {
    expect(validate({ ...validCondition, item_number: '99.4' })).toHaveLength(
      0,
    );
  });

  it('accepts and ignores legacy ESG target fields', () => {
    expect(
      validate({
        ...validCondition,
        target_metric_id: 'legacy',
        target_operator: 'legacy',
        target_value: 'legacy',
      }),
    ).toHaveLength(0);
  });

  it('accepts an informative condition without periodicity', () => {
    const informative: Record<string, unknown> = {
      ...validCondition,
      condition_type: 'INFORMATIVE',
    };
    delete informative.periodicity;
    expect(validate(informative)).toHaveLength(0);
  });
});
