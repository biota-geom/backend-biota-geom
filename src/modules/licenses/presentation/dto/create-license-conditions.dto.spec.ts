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

  it('accepts an informative condition without periodicity, deadline or delivery', () => {
    const informative: Record<string, unknown> = {
      ...validCondition,
      condition_type: 'INFORMATIVE',
    };
    delete informative.periodicity;
    delete informative.deadline;
    delete informative.has_delivery;
    expect(validate(informative)).toHaveLength(0);
  });

  it('accepts null or empty deadline and periodicity on an informative condition', () => {
    expect(
      validate({
        ...validCondition,
        condition_type: 'INFORMATIVE',
        periodicity: '',
        deadline: '',
        alert_date: '',
        has_delivery: false,
      }),
    ).toHaveLength(0);
    expect(
      validate({
        ...validCondition,
        condition_type: 'INFORMATIVE',
        periodicity: null,
        deadline: null,
      }),
    ).toHaveLength(0);
  });

  it('rejects a malformed deadline even on an informative condition', () => {
    expect(
      validate({
        ...validCondition,
        condition_type: 'INFORMATIVE',
        deadline: 'not-a-date',
      }),
    ).not.toHaveLength(0);
  });

  it('requires a valid deadline for periodic conditions with delivery', () => {
    const periodicWithoutDeadline: Record<string, unknown> = {
      ...validCondition,
      condition_type: 'PERIODIC',
    };
    delete periodicWithoutDeadline.deadline;
    expect(validate(periodicWithoutDeadline)).not.toHaveLength(0);
    expect(
      validate({ ...validCondition, condition_type: 'PERIODIC', deadline: '' }),
    ).not.toHaveLength(0);
  });

  it('allows omitting deadline when has_delivery is false', () => {
    const withoutDelivery: Record<string, unknown> = {
      ...validCondition,
      condition_type: 'PERIODIC',
      has_delivery: false,
    };
    delete withoutDelivery.deadline;
    expect(validate(withoutDelivery)).toHaveLength(0);
  });
});
