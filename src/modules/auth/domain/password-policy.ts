export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_RULES: { test: (password: string) => boolean }[] = [
  { test: (password) => password.length >= PASSWORD_MIN_LENGTH },
  { test: (password) => password.length <= PASSWORD_MAX_LENGTH },
  { test: (password) => /[a-z]/.test(password) },
  { test: (password) => /[A-Z]/.test(password) },
  { test: (password) => /\d/.test(password) },
  { test: (password) => /[^A-Za-z0-9]/.test(password) },
];

export function isPasswordStrongEnough(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}
