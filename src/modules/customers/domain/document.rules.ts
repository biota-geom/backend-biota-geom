import { DocumentType } from '@prisma/client';

/*
 * What makes a CPF/CNPJ real is domain knowledge, not an HTTP concern: the
 * document is the join key against the issuing agency and against the
 * customer's own portfolio, so a wrong check digit has to be caught at the
 * edge instead of surfacing much later as a mismatch.
 *
 * Both documents use the same modulo-11 scheme: multiply each digit by a
 * fixed weight, sum, take the remainder of 11, and a remainder below 2 means
 * a check digit of 0. The second digit repeats the calculation with the first
 * check digit already appended.
 */

const CPF_LENGTH = 11;
const CNPJ_LENGTH = 14;
const MODULUS = 11;

const CPF_FIRST_WEIGHTS = [10, 9, 8, 7, 6, 5, 4, 3, 2] as const;
const CPF_SECOND_WEIGHTS = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2] as const;
const CNPJ_FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;
const CNPJ_SECOND_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;

/*
 * Accepts the masked form the form sends and the digits-only form the column
 * holds, so callers on either side of the normalization get the same answer.
 */
export function toDocumentDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function checkDigit(digits: string, weights: readonly number[]): number {
  const sum = weights.reduce(
    (total, weight, index) => total + Number(digits[index]) * weight,
    0,
  );
  const remainder = sum % MODULUS;

  return remainder < 2 ? 0 : MODULUS - remainder;
}

/*
 * A run of one repeated digit (00000000000, 111...) satisfies the arithmetic
 * of both algorithms but is never issued, so it is excluded explicitly.
 */
function isRepeatedDigits(digits: string): boolean {
  return digits.split('').every((digit) => digit === digits[0]);
}

function hasValidCheckDigits(
  digits: string,
  length: number,
  firstWeights: readonly number[],
  secondWeights: readonly number[],
): boolean {
  if (digits.length !== length || isRepeatedDigits(digits)) {
    return false;
  }

  return (
    checkDigit(digits, firstWeights) === Number(digits[firstWeights.length]) &&
    checkDigit(digits, secondWeights) === Number(digits[secondWeights.length])
  );
}

export function isValidCpf(value: string): boolean {
  return hasValidCheckDigits(
    toDocumentDigits(value),
    CPF_LENGTH,
    CPF_FIRST_WEIGHTS,
    CPF_SECOND_WEIGHTS,
  );
}

export function isValidCnpj(value: string): boolean {
  return hasValidCheckDigits(
    toDocumentDigits(value),
    CNPJ_LENGTH,
    CNPJ_FIRST_WEIGHTS,
    CNPJ_SECOND_WEIGHTS,
  );
}

/*
 * document_type accepts CPF as well as CNPJ, so the rule is picked by the
 * declared type instead of assuming every customer is a company.
 */
export function isValidDocument(
  value: string,
  documentType: DocumentType,
): boolean {
  return documentType === DocumentType.CPF
    ? isValidCpf(value)
    : isValidCnpj(value);
}
