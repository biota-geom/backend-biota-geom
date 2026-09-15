import { describe, expect, it } from '@jest/globals';
import { DocumentType } from '@prisma/client';
import {
  isValidCnpj,
  isValidCpf,
  isValidDocument,
  toDocumentDigits,
} from './document.rules';

const REPEATED_CNPJS = Array.from({ length: 10 }, (_, digit) =>
  String(digit).repeat(14),
);
const REPEATED_CPFS = Array.from({ length: 10 }, (_, digit) =>
  String(digit).repeat(11),
);

describe('toDocumentDigits', () => {
  it('keeps only digits', () => {
    expect(toDocumentDigits('11.222.333/0001-81')).toBe('11222333000181');
    expect(toDocumentDigits('529.982.247-25')).toBe('52998224725');
  });

  it('returns an empty string when there is nothing to keep', () => {
    expect(toDocumentDigits('')).toBe('');
    expect(toDocumentDigits('./-')).toBe('');
  });
});

describe('isValidCnpj', () => {
  it.each(['11222333000181', '11444777000161', '45723174000110'])(
    'accepts the real CNPJ %s',
    (document) => {
      expect(isValidCnpj(document)).toBe(true);
    },
  );

  it('accepts the masked form and the digits-only form alike', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
    expect(isValidCnpj('11222333000181')).toBe(true);
  });

  it('rejects a wrong first check digit', () => {
    expect(isValidCnpj('11222333000171')).toBe(false);
  });

  it('rejects a wrong second check digit', () => {
    expect(isValidCnpj('11222333000180')).toBe(false);
  });

  it('rejects the placeholder document used as an example', () => {
    expect(isValidCnpj('12345678000199')).toBe(false);
    expect(isValidCnpj('12.345.678/0001-99')).toBe(false);
  });

  it.each(REPEATED_CNPJS)(
    'rejects the repeated-digit sequence %s even though it satisfies the arithmetic',
    (document) => {
      expect(isValidCnpj(document)).toBe(false);
    },
  );

  it('rejects documents that are too short or too long', () => {
    expect(isValidCnpj('1122233300018')).toBe(false);
    expect(isValidCnpj('112223330001811')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidCnpj('')).toBe(false);
  });

  it('rejects a value whose digits do not add up to 14', () => {
    expect(isValidCnpj('1122233300018A')).toBe(false);
  });

  it('rejects a valid CPF', () => {
    expect(isValidCnpj('52998224725')).toBe(false);
  });
});

describe('isValidCpf', () => {
  it.each(['52998224725', '11144477735', '39053344705'])(
    'accepts the real CPF %s',
    (document) => {
      expect(isValidCpf(document)).toBe(true);
    },
  );

  it('accepts the masked form and the digits-only form alike', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224725')).toBe(true);
  });

  it('rejects a wrong check digit', () => {
    expect(isValidCpf('52998224724')).toBe(false);
    expect(isValidCpf('52998224715')).toBe(false);
  });

  it.each(REPEATED_CPFS)(
    'rejects the repeated-digit sequence %s',
    (document) => {
      expect(isValidCpf(document)).toBe(false);
    },
  );

  it('rejects documents that are too short or too long', () => {
    expect(isValidCpf('5299822472')).toBe(false);
    expect(isValidCpf('529982247251')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidCpf('')).toBe(false);
  });

  it('rejects a valid CNPJ', () => {
    expect(isValidCpf('11222333000181')).toBe(false);
  });
});

describe('isValidDocument', () => {
  it('applies the CNPJ rule to a CNPJ', () => {
    expect(isValidDocument('11222333000181', DocumentType.CNPJ)).toBe(true);
    expect(isValidDocument('12345678000199', DocumentType.CNPJ)).toBe(false);
  });

  it('applies the CPF rule to a CPF', () => {
    expect(isValidDocument('52998224725', DocumentType.CPF)).toBe(true);
    expect(isValidDocument('52998224724', DocumentType.CPF)).toBe(false);
  });

  it('does not accept one document type under the other', () => {
    expect(isValidDocument('52998224725', DocumentType.CNPJ)).toBe(false);
    expect(isValidDocument('11222333000181', DocumentType.CPF)).toBe(false);
  });
});
