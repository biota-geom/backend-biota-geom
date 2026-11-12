/*
 * PT-BR (user-facing) text for the legislations module, mirroring
 * licenses.messages.pt-br.ts: filters reference these constants instead of
 * inlining a literal string.
 */
export const LEGISLATIONS_MESSAGES = {
  LEGISLATION_NOT_FOUND: 'Legislação não encontrada.',
  LICENSE_LEGISLATION_NOT_FOUND:
    'Legislação não encontrada no radar desta licença.',
  LEGISLATION_ALREADY_LINKED: 'Esta legislação já está no radar da licença.',
  SHARED_LEGISLATION_NOT_EDITABLE:
    'Esta legislação também está no radar de outras licenças, então os dados da lei não podem ser alterados aqui. Edite apenas o trecho citado.',
  INVALID_LEGISLATION_REFERENCE:
    'Informe uma legislação já cadastrada ou os dados de uma nova legislação.',
} as const;
