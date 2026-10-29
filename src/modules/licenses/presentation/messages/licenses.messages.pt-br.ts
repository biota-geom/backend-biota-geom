/*
 * PT-BR (user-facing) text for the licenses module, mirroring
 * customers.messages.pt-br.ts: DTOs, validators, controllers and filters
 * reference these constants instead of inlining a literal string.
 */
export const LICENSES_MESSAGES = {
  FILE_REQUIRED: 'Envie o arquivo PDF da licença.',
  INVALID_FILE_TYPE: 'O arquivo deve estar no formato PDF.',
  FILE_TOO_LARGE: 'O arquivo não pode ultrapassar 5MB.',
  INVALID_DATE_RANGE:
    'A data de validade deve ser posterior à data de emissão.',
  LICENSE_NOT_FOUND: 'Licença não encontrada.',
  LICENSE_ALREADY_ARCHIVED: 'Licença já renovada/arquivada.',
  CONDITION_NOT_FOUND: 'Condicionante não encontrada.',
  CONDITION_LICENSE_MISMATCH:
    'A licença informada não corresponde à licença da rota.',
  CONDITION_DUE_DATE_MUST_BE_FUTURE:
    'A data de vencimento deve ser uma data futura.',
  CONDITION_DUE_DATE_REQUIRED:
    'A data de vencimento é obrigatória para registar a condicionante.',
  EXTRACTION_UNREADABLE:
    'Não foi possível ler os dados deste documento. Preencha os campos manualmente.',
  EXTRACTION_UNAVAILABLE:
    'A leitura automática do documento está indisponível no momento. Preencha os campos manualmente.',
  EXTRACTION_TIMEOUT:
    'A leitura do documento demorou mais que o esperado. Tente novamente ou preencha os campos manualmente.',
} as const;
