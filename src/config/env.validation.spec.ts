import { validateEnv } from './env.validation';

const VALID_BASE = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
};

describe('validateEnv', () => {
  it('applies defaults for optional variables', () => {
    const result = validateEnv(VALID_BASE);

    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3000);
    expect(result.JWT_ACCESS_TTL).toBe('15m');
    expect(result.JWT_REFRESH_TTL).toBe('7d');
    expect(result.AUTH_ALLOWED_EMAIL_DOMAIN).toBe('biotageom.com.br');
  });

  it('rejects a missing JWT secret', () => {
    const { JWT_ACCESS_SECRET, ...rest } = VALID_BASE;
    void JWT_ACCESS_SECRET;

    expect(() => validateEnv(rest)).toThrow();
  });

  it('rejects a secret shorter than 32 characters', () => {
    expect(() =>
      validateEnv({ ...VALID_BASE, JWT_ACCESS_SECRET: 'short' }),
    ).toThrow();
  });

  it('rejects identical access and refresh secrets', () => {
    expect(() =>
      validateEnv({
        ...VALID_BASE,
        JWT_ACCESS_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'a'.repeat(32),
      }),
    ).toThrow();
  });

  it('rejects the placeholder secret in production', () => {
    expect(() =>
      validateEnv({
        ...VALID_BASE,
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET:
          'replace-with-a-random-secret-at-least-32-characters-access',
      }),
    ).toThrow();
  });

  it('rejects the placeholder refresh secret in production', () => {
    expect(() =>
      validateEnv({
        ...VALID_BASE,
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET:
          'replace-with-a-random-secret-at-least-32-characters-refresh',
      }),
    ).toThrow();
  });

  it('allows the placeholder-looking secret outside production', () => {
    expect(() =>
      validateEnv({
        ...VALID_BASE,
        NODE_ENV: 'development',
        JWT_ACCESS_SECRET:
          'replace-with-a-random-secret-at-least-32-characters-access',
      }),
    ).not.toThrow();
  });
});
