import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateCustomerAddressDto } from './update-customer-address.dto';

function toDto(plain: Record<string, unknown>): UpdateCustomerAddressDto {
  return plainToInstance(UpdateCustomerAddressDto, plain);
}

describe('UpdateCustomerAddressDto', () => {
  it('accepts an empty payload (all fields optional)', async () => {
    const errors = await validate(toDto({}));

    expect(errors).toHaveLength(0);
  });

  it('accepts a partial payload', async () => {
    const errors = await validate(toDto({ city: 'Canoas', state: 'RS' }));

    expect(errors).toHaveLength(0);
  });

  it('trims whitespace from string fields', () => {
    const dto = toDto({ city: '  Canoas  ' });

    expect(dto.city).toBe('Canoas');
  });

  it('leaves non-string values unchanged', () => {
    const dto = toDto({ city: 123, state: null });

    expect(dto.city).toBe(123);
    expect(dto.state).toBeNull();
  });

  it('rejects an empty string for a provided field', async () => {
    const errors = await validate(toDto({ city: '   ' }));
    const failedProperties = errors.map((error) => error.property);

    expect(failedProperties).toContain('city');
  });
});
