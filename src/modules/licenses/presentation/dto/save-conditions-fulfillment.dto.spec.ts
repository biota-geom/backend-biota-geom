import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { SaveConditionsFulfillmentDto } from './save-conditions-fulfillment.dto';

function validate(body: Record<string, unknown>) {
  return validateSync(plainToInstance(SaveConditionsFulfillmentDto, body), {
    whitelist: true,
  });
}

describe('SaveConditionsFulfillmentDto', () => {
  it('accepts a valid list with mixed fulfilled values', () => {
    expect(
      validate({
        items: [
          {
            condition_id: '550e8400-e29b-41d4-a716-446655440001',
            fulfilled: true,
          },
          {
            condition_id: '550e8400-e29b-41d4-a716-446655440002',
            fulfilled: false,
          },
        ],
      }),
    ).toHaveLength(0);
  });

  it('rejects an empty items array', () => {
    expect(validate({ items: [] })).not.toHaveLength(0);
  });

  it('rejects when items is missing', () => {
    expect(validate({})).not.toHaveLength(0);
  });

  it.each([
    [
      'condition_id is not a UUID',
      { condition_id: 'not-a-uuid', fulfilled: true },
    ],
    [
      'fulfilled is missing',
      { condition_id: '550e8400-e29b-41d4-a716-446655440001' },
    ],
    [
      'fulfilled is not a boolean',
      {
        condition_id: '550e8400-e29b-41d4-a716-446655440001',
        fulfilled: 'yes',
      },
    ],
  ])('rejects when item has %s', (_, item) => {
    expect(validate({ items: [item] })).not.toHaveLength(0);
  });
});
