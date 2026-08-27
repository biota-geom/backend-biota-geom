// Exact match only — do not switch to `endsWith`, which would also accept
// lookalike domains such as "evil-biotageom.com.br" or
// "biotageom.com.br.evil.com".
export function isEmailDomainAllowed(
  email: string,
  allowedDomain: string,
): boolean {
  const atIndex = email.lastIndexOf('@');

  if (atIndex === -1 || atIndex === email.length - 1) {
    return false;
  }

  const domain = email.slice(atIndex + 1).toLowerCase();

  return domain === allowedDomain.toLowerCase();
}
