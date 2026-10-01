import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateLicenseConditionsDto } from './create-license-conditions.dto';

const validCondition = {
  item_number: '1.1',
  description: 'Condition description',
  condition_type: 'PERIODIC',
  periodicity: 'ANNUAL',
  deadline: '2026-12-31T00:00:00.000Z',
  responsible_name: 'Lucas Silva',
  esg_metric_id: '550e8400-e29b-41d4-a716-446655440000',
};

function validate(condition: Record<string, unknown>) {
  return validateSync(
    plainToInstance(CreateLicenseConditionsDto, { conditions: [condition] }),
  );
}

describe('CreateLicenseConditionsDto', () => {
  it('accepts a condition categorized by a GRI parameter', () => {
    expect(validate(validCondition)).toHaveLength(0);
  });

  it('requires the GRI parameter', () => {
    const withoutMetric: Record<string, unknown> = { ...validCondition };
    delete withoutMetric.esg_metric_id;

    expect(validate(withoutMetric)).not.toHaveLength(0);
  });

  it('rejects a malformed esg_metric_id', () => {
    expect(
      validate({ ...validCondition, esg_metric_id: 'not-a-uuid' }),
    ).not.toHaveLength(0);
  });

  it('accepts an informative condition without periodicity', () => {
    const informative: Record<string, unknown> = {
      ...validCondition,
      condition_type: 'INFORMATIVE',
    };
    delete informative.periodicity;

    expect(validate(informative)).toHaveLength(0);
  });

  it('accepts an optional title up to 160 characters', () => {
    expect(validate({ ...validCondition, title: 'Relatório' })).toHaveLength(0);
    expect(
      validate({ ...validCondition, title: 'x'.repeat(161) }),
    ).not.toHaveLength(0);
  });
});
