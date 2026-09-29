import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateLicenseConditionsDto } from './create-license-conditions.dto';

const validCondition = {
  item_number: '1.1',
  description: 'Condition description',
  condition_type: 'INFORMATIVE',
  periodicity: 'ANNUAL',
  deadline: '2026-12-31T00:00:00.000Z',
  responsible_name: 'Lucas Silva',
};

describe('CreateLicenseConditionsDto', () => {
  it('accepts an optional category_id when it is a UUID', () => {
    const dto = plainToInstance(CreateLicenseConditionsDto, {
      conditions: [
        {
          ...validCondition,
          category_id: '550e8400-e29b-41d4-a716-446655440000',
        },
      ],
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('rejects a malformed category_id', () => {
    const dto = plainToInstance(CreateLicenseConditionsDto, {
      conditions: [{ ...validCondition, category_id: 'not-a-uuid' }],
    });

    expect(validateSync(dto)).not.toHaveLength(0);
  });

  it('allows conditions without a category_id', () => {
    const dto = plainToInstance(CreateLicenseConditionsDto, {
      conditions: [validCondition],
    });

    expect(validateSync(dto)).toHaveLength(0);
  });
});
