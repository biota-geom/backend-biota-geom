/*
 * PT-BR (user-facing) text for the ESG indicators module, mirroring
 * licenses.messages.pt-br.ts: DTOs, filters and controllers reference these
 * constants instead of inlining a literal string.
 */
export const ESG_INDICATORS_MESSAGES = {
  INVALID_MONTH: 'Informe o mês no formato AAAA-MM, por exemplo 2026-09.',
  RECORDS_MUST_BE_LIST: 'Informe a lista de medições do mês.',
  TOO_MANY_RECORDS: 'Muitas medições na mesma requisição.',
  INDICATOR_ID_INVALID: 'Informe um identificador de indicador válido.',
  VALUE_MUST_BE_NUMBER:
    'O valor do indicador deve ser um número com no máximo 4 casas decimais.',
  VALUE_MUST_NOT_BE_NEGATIVE: 'O valor do indicador não pode ser negativo.',
  VALUE_TOO_LARGE: 'O valor do indicador excede o limite permitido.',
  INDICATOR_NOT_CONFIGURED:
    'Um ou mais indicadores informados não estão configurados para esta empresa.',
  DUPLICATED_INDICATOR_RECORD:
    'Cada indicador pode aparecer uma única vez na requisição.',
  INDICATOR_ALREADY_EXISTS:
    'Já existe um indicador com este nome nesta empresa.',
  INDICATOR_NAME_REQUIRED: 'Informe o nome do indicador.',
  INDICATOR_NAME_TOO_LONG: 'O nome do indicador excede o tamanho permitido.',
  INDICATOR_UNIT_REQUIRED: 'Informe a unidade de medida do indicador.',
  INDICATOR_UNIT_TOO_LONG: 'A unidade de medida excede o tamanho permitido.',
  INDICATOR_CATEGORY_INVALID:
    'Informe uma categoria válida: Ambiental, Social ou Governança.',
} as const;
