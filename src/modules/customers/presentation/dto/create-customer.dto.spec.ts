import { AddressType, DocumentType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CUSTOMERS_MESSAGES } from '../messages/customers.messages.pt-br';
import { CreateCustomerDto } from './create-customer.dto';

function buildPayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: 'Unidade Industrial RS',
    document: '11222333000181',
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

function documentMessages(
  errors: ReturnType<typeof validateSync>,
): readonly string[] {
  const documentError = errors.find((error) => error.property === 'document');

  return Object.values(documentError?.constraints ?? {});
}

describe('CreateCustomerDto', () => {
  it('accepts a well-formed payload', () => {
    expect(validate(buildPayload()).errors).toHaveLength(0);
  });

  /*
   * The registration form collects the unit's identification, its segment and
   * its environmental contact — not the company's own switchboard or the full
   * street address. Those five fields stay in the model for whoever fills them
   * in later, so the endpoint has to accept a payload that omits them.
   */
  describe('optional contact and address details', () => {
    const OPTIONAL_CUSTOMER_FIELDS = ['email', 'owner_phone'] as const;
    const OPTIONAL_ADDRESS_FIELDS = [
      'street',
      'number',
      'postal_code',
    ] as const;

    function withoutOptionalFields(): Record<string, unknown> {
      const payload = buildPayload();

      for (const field of OPTIONAL_CUSTOMER_FIELDS) {
        delete payload[field];
      }

      const address = payload.address as Record<string, unknown>;

      for (const field of OPTIONAL_ADDRESS_FIELDS) {
        delete address[field];
      }

      return payload;
    }

    it('accepts a payload that omits all of them at once', () => {
      expect(validate(withoutOptionalFields()).errors).toHaveLength(0);
    });

    it.each(OPTIONAL_CUSTOMER_FIELDS)(
      'accepts a payload without %s',
      (field) => {
        const payload = buildPayload();
        delete payload[field];

        expect(validate(payload).errors).toHaveLength(0);
      },
    );

    it.each(OPTIONAL_ADDRESS_FIELDS)(
      'accepts an address without %s',
      (field) => {
        const payload = buildPayload();
        delete (payload.address as Record<string, unknown>)[field];

        expect(validate(payload).errors).toHaveLength(0);
      },
    );

    /*
     * Optional means "may be absent", not "may be anything": a value that is
     * present still has to be well formed, otherwise a typo in the e-mail would
     * now sail through where it used to be caught.
     */
    it('still rejects a malformed e-mail when one is sent', () => {
      const { errors } = validate(buildPayload({ email: 'nao-e-email' }));

      expect(errors.some((error) => error.property === 'email')).toBe(true);
    });

    it('still rejects an over-long postal code when one is sent', () => {
      const payload = buildPayload();
      (payload.address as Record<string, unknown>).postal_code = 'x'.repeat(21);

      const addressErrors = validate(payload).errors.find(
        (error) => error.property === 'address',
      );

      expect(
        addressErrors?.children?.some(
          (child) => child.property === 'postal_code',
        ),
      ).toBe(true);
    });
  });

  it('strips the mask from the document', () => {
    const { dto, errors } = validate(
      buildPayload({ document: '11.222.333/0001-81' }),
    );

    expect(errors).toHaveLength(0);
    expect(dto.document).toBe('11222333000181');
  });

  it('trims surrounding whitespace on text fields', () => {
    const { dto } = validate(buildPayload({ name: '  Unidade RS  ' }));

    expect(dto.name).toBe('Unidade RS');
  });

  it('leaves a non-string document untouched for the validator to reject', () => {
    const { dto, errors } = validate(
      buildPayload({ document: 11222333000181 }),
    );

    expect(dto.document).toBe(11222333000181);
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

  it('rejects a CNPJ whose check digits do not add up', () => {
    const { errors } = validate(buildPayload({ document: '12345678000199' }));

    expect(documentMessages(errors)).toContain(CUSTOMERS_MESSAGES.INVALID_CNPJ);
  });

  it('rejects a masked CNPJ whose check digits do not add up', () => {
    const { errors } = validate(
      buildPayload({ document: '12.345.678/0001-99' }),
    );

    expect(documentMessages(errors)).toContain(CUSTOMERS_MESSAGES.INVALID_CNPJ);
  });

  it('rejects a repeated-digit sequence', () => {
    const { errors } = validate(
      buildPayload({ document: '11.111.111/1111-11' }),
    );

    expect(documentMessages(errors)).toContain(CUSTOMERS_MESSAGES.INVALID_CNPJ);
  });

  it('accepts a CPF when the payload declares document_type CPF', () => {
    const { dto, errors } = validate(
      buildPayload({
        document: '529.982.247-25',
        document_type: DocumentType.CPF,
      }),
    );

    expect(errors).toHaveLength(0);
    expect(dto.document).toBe('52998224725');
  });

  it('rejects a CPF sent as a CNPJ and reports the declared type', () => {
    const { errors } = validate(
      buildPayload({
        document: '52998224725',
        document_type: DocumentType.CNPJ,
      }),
    );

    expect(documentMessages(errors)).toContain(CUSTOMERS_MESSAGES.INVALID_CNPJ);
  });

  it('rejects a CPF with a wrong check digit and reports it as a CPF', () => {
    const { errors } = validate(
      buildPayload({
        document: '52998224724',
        document_type: DocumentType.CPF,
      }),
    );

    expect(documentMessages(errors)).toContain(CUSTOMERS_MESSAGES.INVALID_CPF);
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
