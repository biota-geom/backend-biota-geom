/*
 * PT-BR (user-facing) text for the ESG indicators module, mirroring
 * licenses.messages.pt-br.ts: DTOs, filters and controllers reference these
 * constants instead of inlining a literal string.
 */
export const ESG_INDICATORS_MESSAGES = {
  INVALID_MONTH: 'Informe o mês no formato AAAA-MM, por exemplo 2026-09.',
  VALUE_MUST_BE_NUMBER:
    'O valor do indicador deve ser um número com no máximo 4 casas decimais.',
  VALUE_MUST_NOT_BE_NEGATIVE: 'O valor do indicador não pode ser negativo.',
  VALUE_TOO_LARGE: 'O valor do indicador excede o limite permitido.',
  EMPLOYEES_MUST_BE_INTEGER:
    'O número de funcionários deve ser um número inteiro.',
} as const;
