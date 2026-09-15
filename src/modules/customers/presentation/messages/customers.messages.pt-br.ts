/*
 * PT-BR (user-facing) text for the customers module, mirroring
 * auth.messages.pt-br.ts: DTOs, validators, controllers and filters reference
 * these constants instead of inlining a literal string in a response.
 */
export const CUSTOMERS_MESSAGES = {
  INVALID_CPF: 'Informe um CPF válido.',
  INVALID_CNPJ: 'Informe um CNPJ válido.',
  INVALID_DOCUMENT: 'Informe um CPF ou CNPJ válido.',
} as const;
