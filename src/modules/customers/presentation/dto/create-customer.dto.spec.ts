import { AddressType, DocumentType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateCustomerDto } from './create-customer.dto';

function buildPayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: 'Unidade Industrial RS',
    document: '12345678000199',
    document_type: DocumentType.CNPJ,
    sector_id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'contato@unidade.com.br',
    owner_name: 'Ana Silva',
    owner_email: 'ana.silva@unidade.com.br',
    owner_phone: '+55 51 99999-0000',
    address: {
      type: AddressType.BILLING,
      street: 'Av. Assis Brasil',
      number: '123',
      city: 'Porto Alegre',
      state: 'RS',
      postal_code: '91010-000',
      country_code: 'BR',
    },
    ...overrides,
  };
}

function validate(payload: Record<string, unknown>): {
  dto: CreateCustomerDto;
  errors: ReturnType<typeof validateSync>;
} {
  const dto = plainToInstance(CreateCustomerDto, payload);

  return { dto, errors: validateSync(dto, { whitelist: true }) };
}

describe('CreateCustomerDto', () => {
  it('accepts a well-formed payload', () => {
    expect(validate(buildPayload()).errors).toHaveLength(0);
  });

  it('strips the mask from the document', () => {
    const { dto, errors } = validate(
      buildPayload({ document: '12.345.678/0001-99' }),
    );

    expect(errors).toHaveLength(0);
    expect(dto.document).toBe('12345678000199');
  });

  it('trims surrounding whitespace on text fields', () => {
    const { dto } = validate(buildPayload({ name: '  Unidade RS  ' }));

    expect(dto.name).toBe('Unidade RS');
  });

  it('leaves a non-string document untouched for the validator to reject', () => {
    const { dto, errors } = validate(
      buildPayload({ document: 12345678000199 }),
    );

    expect(dto.document).toBe(12345678000199);
    expect(errors.map((error) => error.property)).toContain('document');
  });

  it('leaves a non-string name untouched for the validator to reject', () => {
    const { dto, errors } = validate(buildPayload({ name: 42 }));

    expect(dto.name).toBe(42);
    expect(errors.map((error) => error.property)).toContain('name');
  });

  it('rejects a document longer than 14 digits', () => {
    const { errors } = validate(buildPayload({ document: '123456789001999' }));

    expect(errors.map((error) => error.property)).toContain('document');
  });

  it('rejects an unknown document type', () => {
    const { errors } = validate(buildPayload({ document_type: 'RG' }));

    expect(errors.map((error) => error.property)).toContain('document_type');
  });

  it('rejects a sector id that is not a uuid', () => {
    const { errors } = validate(buildPayload({ sector_id: 'not-a-uuid' }));

    expect(errors.map((error) => error.property)).toContain('sector_id');
  });

  it('rejects a malformed email', () => {
    const { errors } = validate(buildPayload({ email: 'sem-arroba' }));

    expect(errors.map((error) => error.property)).toContain('email');
  });

  it('validates the nested address instead of waving it through', () => {
    const { errors } = validate(
      buildPayload({
        address: { ...(buildPayload().address as object), type: 'MATRIZ' },
      }),
    );

    const address = errors.find((error) => error.property === 'address');
    expect(address?.children?.map((child) => child.property)).toContain('type');
  });

  it('requires the address to be present', () => {
    const payload = buildPayload();
    delete payload.address;

    expect(validate(payload).errors.map((error) => error.property)).toContain(
      'address',
    );
  });
});
