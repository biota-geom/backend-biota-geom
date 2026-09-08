/*
 * The ONLY file in the backend allowed to contain PT-BR (user-facing) text.
 * Controllers, filters, pipes and guards must reference these constants —
 * never inline a literal string in a response.
 */
export const AUTH_MESSAGES = {
  INVALID_REQUEST:
    'Não foi possível processar os dados enviados. Verifique as informações e tente novamente.',
  WEAK_PASSWORD: 'A senha não atende aos requisitos mínimos de segurança.',
  PASSWORD_CONFIRMATION_MISMATCH: 'A confirmação de senha não confere.',
  REGISTRATION_NOT_ALLOWED: 'Não foi possível autorizar este cadastro.',
  INVALID_CREDENTIALS: 'As credenciais inseridas não foram encontradas.',
  SESSION_EXPIRED: 'Sua sessão expirou. Faça login novamente.',
  TOO_MANY_ATTEMPTS:
    'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  UNEXPECTED_ERROR:
    'Não foi possível concluir a operação. Tente novamente mais tarde.',
} as const;
