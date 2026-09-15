import { DocumentType } from '@prisma/client';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import {
  isValidCnpj,
  isValidCpf,
  isValidDocument,
} from '../../domain/document.rules';
import { CUSTOMERS_MESSAGES } from '../messages/customers.messages.pt-br';

/*
 * HTTP adapter for the domain check-digit rules: it only resolves which rule
 * applies (from the sibling document_type) and picks the message the frontend
 * renders verbatim. The arithmetic itself stays in domain/document.rules.ts.
 */

function declaredDocumentType(
  args: ValidationArguments,
): DocumentType | undefined {
  const [documentTypeProperty] = args.constraints as [string];
  const declared = (args.object as Record<string, unknown>)[
    documentTypeProperty
  ];

  return declared === DocumentType.CPF || declared === DocumentType.CNPJ
    ? declared
    : undefined;
}

export function validateDocument(
  value: unknown,
  args: ValidationArguments,
): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const documentType = declaredDocumentType(args);

  /*
   * PUT accepts a document without repeating document_type, and the stored
   * type is not visible from here, so either rule may vouch for the value.
   */
  return documentType
    ? isValidDocument(value, documentType)
    : isValidCpf(value) || isValidCnpj(value);
}

export function documentErrorMessage(args: ValidationArguments): string {
  const documentType = declaredDocumentType(args);

  if (documentType === DocumentType.CPF) {
    return CUSTOMERS_MESSAGES.INVALID_CPF;
  }

  if (documentType === DocumentType.CNPJ) {
    return CUSTOMERS_MESSAGES.INVALID_CNPJ;
  }

  return CUSTOMERS_MESSAGES.INVALID_DOCUMENT;
}

export function IsValidDocument(
  documentTypeProperty: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target: object, propertyName: string | symbol): void => {
    registerDecorator({
      name: 'isValidDocument',
      target: target.constructor,
      propertyName: propertyName as string,
      constraints: [documentTypeProperty],
      options: validationOptions,
      validator: {
        validate: validateDocument,
        defaultMessage: documentErrorMessage,
      },
    });
  };
}
