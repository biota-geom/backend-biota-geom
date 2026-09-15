import { describe, expect, it } from '@jest/globals';
import { DocumentType } from '@prisma/client';
import { ValidationArguments } from 'class-validator';
import { CUSTOMERS_MESSAGES } from '../messages/customers.messages.pt-br';
import {
  documentErrorMessage,
  validateDocument,
} from './is-valid-document.validator';

function buildArgs(
  value: unknown,
  documentType?: unknown,
): ValidationArguments {
  return {
    value,
    constraints: ['document_type'],
    targetName: 'CreateCustomerDto',
    object: { document: value, document_type: documentType },
    property: 'document',
  };
}

describe('validateDocument', () => {
  it('checks a CNPJ against the CNPJ rule', () => {
    expect(
      validateDocument('11222333000181', buildArgs('11222333000181', 'CNPJ')),
    ).toBe(true);
    expect(
      validateDocument('11111111111111', buildArgs('11111111111111', 'CNPJ')),
    ).toBe(false);
    expect(
      validateDocument('52998224725', buildArgs('52998224725', 'CNPJ')),
    ).toBe(false);
  });

  it('checks a CPF against the CPF rule', () => {
    expect(
      validateDocument('52998224725', buildArgs('52998224725', 'CPF')),
    ).toBe(true);
    expect(
      validateDocument('11222333000181', buildArgs('11222333000181', 'CPF')),
    ).toBe(false);
  });

  /*
   * PUT may send document without repeating document_type; the stored type is
   * not visible from the DTO, so either rule may vouch for the value.
   */
  it('accepts either document when the type is absent or unknown', () => {
    expect(
      validateDocument('11222333000181', buildArgs('11222333000181')),
    ).toBe(true);
    expect(validateDocument('52998224725', buildArgs('52998224725'))).toBe(
      true,
    );
    expect(
      validateDocument('12345678000199', buildArgs('12345678000199')),
    ).toBe(false);
    expect(
      validateDocument('11222333000181', buildArgs('11222333000181', 'RG')),
    ).toBe(true);
  });

  it('rejects a value that is not a string', () => {
    expect(validateDocument(11222333000181, buildArgs(11222333000181))).toBe(
      false,
    );
    expect(validateDocument(null, buildArgs(null))).toBe(false);
  });
});

describe('documentErrorMessage', () => {
  it('names CNPJ when the payload declares a CNPJ', () => {
    expect(documentErrorMessage(buildArgs('x', DocumentType.CNPJ))).toBe(
      CUSTOMERS_MESSAGES.INVALID_CNPJ,
    );
  });

  it('names CPF when the payload declares a CPF', () => {
    expect(documentErrorMessage(buildArgs('x', DocumentType.CPF))).toBe(
      CUSTOMERS_MESSAGES.INVALID_CPF,
    );
  });

  it('falls back to a message covering both when no type was declared', () => {
    expect(documentErrorMessage(buildArgs('x'))).toBe(
      CUSTOMERS_MESSAGES.INVALID_DOCUMENT,
    );
  });
});
