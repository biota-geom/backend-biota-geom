/*
 * PT-BR (user-facing) text for the licenses module, mirroring
 * customers.messages.pt-br.ts: DTOs, validators, controllers and filters
 * reference these constants instead of inlining a literal string.
 */
export const LICENSES_MESSAGES = {
  FILE_REQUIRED: 'Envie o arquivo PDF da licença.',
  INVALID_FILE_TYPE: 'O arquivo deve estar no formato PDF.',
  FILE_TOO_LARGE: 'O arquivo não pode ultrapassar 5MB.',
  ISSUING_AGENCY_NOT_FOUND: 'Órgão emissor inexistente.',
  INVALID_DATE_RANGE:
    'A data de validade deve ser posterior à data de emissão.',
  LICENSE_NOT_FOUND: 'Licença não encontrada.',
  CONDITION_LICENSE_MISMATCH:
    'A licença informada não corresponde à licença da rota.',
  CONDITION_DUE_DATE_MUST_BE_FUTURE:
    'A data de vencimento deve ser uma data futura.',
} as const;
