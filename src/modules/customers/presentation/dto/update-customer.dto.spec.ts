import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateCustomerDto } from './update-customer.dto';

function toDto(plain: Record<string, unknown>): UpdateCustomerDto {
  return plainToInstance(UpdateCustomerDto, plain);
}

describe('UpdateCustomerDto', () => {
  const validPlain = {
    name: 'Siderurgia Sul Porto Alegre (Atualizada)',
    document: '12345678000199',
    document_type: 'cnpj',
    sector_id: '550e8400-e29b-41d4-a716-446655440000',
    responsible_name: 'Novo Responsável',
    responsible_email: 'novo@empresa.com',
    address: { type: 'billing', state: 'RS', city: 'Canoas' },
    esg_indicator_ids: [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
    ],
  };

  it('accepts a complete valid payload', async () => {
    const errors = await validate(toDto(validPlain));

    expect(errors).toHaveLength(0);
  });

  it('accepts an empty esg_indicator_ids array to clear all links', async () => {
    const errors = await validate(
      toDto({ ...validPlain, esg_indicator_ids: [] }),
    );

    expect(errors).toHaveLength(0);
  });

  it('accepts a payload with only esg_indicator_ids provided', async () => {
    const errors = await validate(
      toDto({ esg_indicator_ids: validPlain.esg_indicator_ids }),
    );

    expect(errors).toHaveLength(0);
  });

  it('requires esg_indicator_ids to be present', async () => {
    const withoutIndicators: Record<string, unknown> = { ...validPlain };
    delete withoutIndicators.esg_indicator_ids;
    const errors = await validate(toDto(withoutIndicators));
    const failedProperties = errors.map((error) => error.property);

    expect(failedProperties).toContain('esg_indicator_ids');
  });

  it('rejects duplicated or invalid ESG indicator ids', async () => {
    const errors = await validate(
      toDto({
        ...validPlain,
        esg_indicator_ids: [
          '550e8400-e29b-41d4-a716-446655440001',
          '550e8400-e29b-41d4-a716-446655440001',
          'not-a-uuid',
        ],
      }),
    );
    const failedProperties = errors.map((error) => error.property);

    expect(failedProperties).toContain('esg_indicator_ids');
  });

  it('rejects an invalid nested address and invalid emails', async () => {
    const errors = await validate(
      toDto({
        ...validPlain,
        responsible_email: 'not-an-email',
        address: { city: '' },
      }),
    );
    const failedProperties = errors.map((error) => error.property);

    expect(failedProperties).toEqual(
      expect.arrayContaining(['responsible_email', 'address']),
    );
  });

  it('trims whitespace from string fields', () => {
    const dto = toDto({ ...validPlain, name: '  Empresa  ' });

    expect(dto.name).toBe('Empresa');
  });

  it('leaves non-string values for trimmed fields unchanged', () => {
    const dto = toDto({ ...validPlain, name: 123, document: null });

    expect(dto.name).toBe(123);
    expect(dto.document).toBeNull();
  });
});
