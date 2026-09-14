import { loginSchema } from './login.schema';

describe('loginSchema', () => {
  it('accepts a valid payload and lowercases the email', () => {
    const result = loginSchema.parse({
      email: 'John.Doe@Biotageom.com.br',
      password: 'whatever-it-is',
    });

    expect(result).toEqual({
      email: 'john.doe@biotageom.com.br',
      password: 'whatever-it-is',
    });
  });

  it('does not apply the password-strength policy', () => {
    const result = loginSchema.parse({
      email: 'john.doe@biotageom.com.br',
      password: 'a',
    });

    expect(result.password).toBe('a');
  });

  it('rejects a malformed email', () => {
    expect(() =>
      loginSchema.parse({ email: 'not-an-email', password: 'whatever' }),
    ).toThrow();
  });

  it('rejects an empty password', () => {
    expect(() =>
      loginSchema.parse({ email: 'john.doe@biotageom.com.br', password: '' }),
    ).toThrow();
  });
});
