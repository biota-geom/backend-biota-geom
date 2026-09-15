import { describe, expect, it } from '@jest/globals';
import { AddressType, DocumentType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CUSTOMERS_MESSAGES } from '../messages/customers.messages.pt-br';
import { UpdateCustomerDto } from './update-customer.dto';

function toDto(plain: Record<string, unknown>): UpdateCustomerDto {
  return plainToInstance(UpdateCustomerDto, plain);
}

function documentMessages(errors: ValidationError[]): readonly string[] {
  const documentError = errors.find((error) => error.property === 'document');

  return Object.values(documentError?.constraints ?? {});
}

describe('UpdateCustomerDto', () => {
  const validPlain = {
    name: 'Siderurgia Sul Porto Alegre (Atualizada)',
    document: '11222333000181',
    document_type: DocumentType.CNPJ,
    sector_id: '550e8400-e29b-41d4-a716-446655440000',
    responsible_name: 'Novo Responsável',
    responsible_email: 'novo@empresa.com',
    address: { type: AddressType.BILLING, state: 'RS', city: 'Canoas' },
  };

  it('accepts a complete valid payload', async () => {
    const errors = await validate(toDto(validPlain));

    expect(errors).toHaveLength(0);
  });

  it('accepts an empty payload (all fields optional)', async () => {
    const errors = await validate(toDto({}));

    expect(errors).toHaveLength(0);
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

  it('strips the mask from the document, like the create path', async () => {
    const dto = toDto({ ...validPlain, document: '11.222.333/0001-81' });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.document).toBe('11222333000181');
  });

  it('rejects a CNPJ whose check digits do not add up', async () => {
    const errors = await validate(
      toDto({ ...validPlain, document: '12345678000199' }),
    );

    expect(documentMessages(errors)).toContain(CUSTOMERS_MESSAGES.INVALID_CNPJ);
  });

  it('rejects a repeated-digit sequence', async () => {
    const errors = await validate(
      toDto({ ...validPlain, document: '11.111.111/1111-11' }),
    );

    expect(documentMessages(errors)).toContain(CUSTOMERS_MESSAGES.INVALID_CNPJ);
  });

  it('accepts a CPF when the payload declares document_type CPF', async () => {
    const errors = await validate(
      toDto({
        ...validPlain,
        document: '52998224725',
        document_type: DocumentType.CPF,
      }),
    );

    expect(errors).toHaveLength(0);
  });

  /*
   * A partial update may send the document without repeating document_type,
   * so either rule may vouch for it — but an impossible document is still out.
   */
  it('still checks the document when document_type is omitted', async () => {
    await expect(
      validate(toDto({ document: '11222333000181' })),
    ).resolves.toHaveLength(0);
    await expect(
      validate(toDto({ document: '52998224725' })),
    ).resolves.toHaveLength(0);

    const errors = await validate(toDto({ document: '12345678000199' }));

    expect(documentMessages(errors)).toContain(
      CUSTOMERS_MESSAGES.INVALID_DOCUMENT,
    );
  });

  it('keeps accepting a payload that does not touch the document', async () => {
    const errors = await validate(toDto({ name: 'Somente o nome' }));

    expect(errors).toHaveLength(0);
  });
});
