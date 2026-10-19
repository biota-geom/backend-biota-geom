import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateLicenseConditionDto } from './update-license-condition.dto';

function validate(body: Record<string, unknown>) {
  return validateSync(plainToInstance(UpdateLicenseConditionDto, body));
}

describe('UpdateLicenseConditionDto', () => {
  it('accepts an empty partial update', () => {
    expect(validate({})).toHaveLength(0);
  });

  it('accepts a new title and due date', () => {
    expect(
      validate({ title: 'Relatório', due_date: '2027-01-01T00:00:00.000Z' }),
    ).toHaveLength(0);
  });

  it('accepts the environmental descriptor, delivery and manual violation fields', () => {
    expect(
      validate({
        environmental_descriptor: 'Resíduos sólidos',
        has_delivery: false,
        is_violated: true,
      }),
    ).toHaveLength(0);
  });

  it('accepts and ignores legacy numbering and compliance-target fields', () => {
    expect(
      validate({
        item_number: '99.4',
        target_metric_id: 'legacy',
        target_operator: 'legacy',
        target_value: 'legacy',
      }),
    ).toHaveLength(0);
  });

  it.each([
    ['title', { title: null }],
    ['an empty title', { title: '' }],
    ['a title longer than 160 characters', { title: 'x'.repeat(161) }],
    ['due_date', { due_date: null }],
    ['an invalid due_date', { due_date: 'amanhã' }],
  ])('rejects clearing or invalid %s', (_, body) => {
    expect(validate(body)).not.toHaveLength(0);
  });
});
