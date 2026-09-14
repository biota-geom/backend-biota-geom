import { validateEnv } from './env.validation';
import { describe, expect, it } from '@jest/globals';

// Exemplo de teste de referência: `validateEnv` é uma função pura (sem
// NestJS, sem banco, sem I/O), então não precisamos de TestingModule nem de
// mocks. Ideal como primeiro teste do projeto e como modelo para testar
// outras validações de fronteira (DTOs, outras env vars, etc).
describe('validateEnv', () => {
  // Config mínima e válida usada como base em cada teste. Cada `it` só
  // sobrescreve o que quer testar, deixando claro qual é a variável em foco.
  const validConfig = {
    NODE_ENV: 'test',
    PORT: '3000',
    DATABASE_URL: 'postgresql://user:password@localhost:5432/db',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
  };

  it('returns the parsed and typed env vars when the config is valid', () => {
    const result = validateEnv(validConfig);

    expect(result).toEqual({
      NODE_ENV: 'test',
      PORT: 3000,
      DATABASE_URL: 'postgresql://user:password@localhost:5432/db',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      JWT_ACCESS_TTL: '15m',
      JWT_REFRESH_TTL: '7d',
      JWT_ISSUER: 'biota-geom-api',
      JWT_AUDIENCE: 'biota-geom-web',
      AUTH_ALLOWED_EMAIL_DOMAIN: 'biotageom.com.br',
      CORS_ORIGINS: 'http://localhost:5173',
    });
  });

  it('applies the documented defaults for the optional variables', () => {
    const result = validateEnv({
      DATABASE_URL: validConfig.DATABASE_URL,
      JWT_ACCESS_SECRET: validConfig.JWT_ACCESS_SECRET,
      JWT_REFRESH_SECRET: validConfig.JWT_REFRESH_SECRET,
    });

    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3000);
    expect(result.JWT_ACCESS_TTL).toBe('15m');
    expect(result.JWT_REFRESH_TTL).toBe('7d');
    expect(result.JWT_ISSUER).toBe('biota-geom-api');
    expect(result.JWT_AUDIENCE).toBe('biota-geom-web');
    expect(result.AUTH_ALLOWED_EMAIL_DOMAIN).toBe('biotageom.com.br');
    expect(result.CORS_ORIGINS).toBe('http://localhost:5173');
  });

  it('throws with a message naming the missing variable when DATABASE_URL is absent', () => {
    const { DATABASE_URL: _ignored, ...configWithoutDatabaseUrl } = validConfig;
    void _ignored;

    // Testamos o conteúdo da mensagem, não só que "lançou algo": é isso que
    // dá ao dev, ao iniciar a app com env errada, um erro acionável em vez
    // de um erro genérico de conexão com o banco (ver README).
    expect(() => validateEnv(configWithoutDatabaseUrl)).toThrow(/DATABASE_URL/);
  });

  it('accepts both the bare "postgres" and the "postgresql" protocol', () => {
    expect(() =>
      validateEnv({
        ...validConfig,
        DATABASE_URL: 'postgres://user:password@localhost:5432/db',
      }),
    ).not.toThrow();
  });

  it('throws when DATABASE_URL uses a protocol other than postgres/postgresql', () => {
    expect(() =>
      validateEnv({ ...validConfig, DATABASE_URL: 'mysql://localhost/db' }),
    ).toThrow(/DATABASE_URL/);
  });

  // Estes dois casos existem para travar a âncora `^...$` da regex do
  // protocolo: sem eles, é possível "consertar" a regex de um jeito que
  // ainda passa nos outros testes mas aceita um protocolo inválido.
  it('rejects a protocol that merely starts with "postgres" (e.g. "postgresqlx")', () => {
    expect(() =>
      validateEnv({
        ...validConfig,
        DATABASE_URL: 'postgresqlx://localhost/db',
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it('rejects a protocol that merely ends with "postgresql" (e.g. "xpostgresql")', () => {
    expect(() =>
      validateEnv({
        ...validConfig,
        DATABASE_URL: 'xpostgresql://localhost/db',
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it('throws when PORT is not a positive integer', () => {
    expect(() => validateEnv({ ...validConfig, PORT: '-1' })).toThrow(/PORT/);
  });

  it('throws when NODE_ENV is outside the allowed enum', () => {
    expect(() => validateEnv({ ...validConfig, NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV/,
    );
  });

  it.each(['development', 'production', 'test'] as const)(
    'accepts %s as a valid NODE_ENV',
    (nodeEnv) => {
      expect(validateEnv({ ...validConfig, NODE_ENV: nodeEnv }).NODE_ENV).toBe(
        nodeEnv,
      );
    },
  );

  it('rejects a missing JWT secret', () => {
    const { JWT_ACCESS_SECRET: _ignored, ...rest } = validConfig;
    void _ignored;

    expect(() => validateEnv(rest)).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejects a secret shorter than 32 characters', () => {
    expect(() =>
      validateEnv({ ...validConfig, JWT_ACCESS_SECRET: 'short' }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejects identical access and refresh secrets', () => {
    expect(() =>
      validateEnv({
        ...validConfig,
        JWT_ACCESS_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'a'.repeat(32),
      }),
    ).toThrow(/JWT_REFRESH_SECRET/);
  });

  it('rejects the placeholder access secret in production', () => {
    expect(() =>
      validateEnv({
        ...validConfig,
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET:
          'replace-with-a-random-secret-at-least-32-characters-access',
      }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejects the placeholder refresh secret in production', () => {
    expect(() =>
      validateEnv({
        ...validConfig,
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET:
          'replace-with-a-random-secret-at-least-32-characters-refresh',
      }),
    ).toThrow(/JWT_REFRESH_SECRET/);
  });

  it('allows the placeholder-looking secret outside production', () => {
    expect(() =>
      validateEnv({
        ...validConfig,
        NODE_ENV: 'development',
        JWT_ACCESS_SECRET:
          'replace-with-a-random-secret-at-least-32-characters-access',
      }),
    ).not.toThrow();
  });

  it('joins multiple validation issues in the error message with a newline per issue', () => {
    // Cobre o `.join('\n')` usado para montar a mensagem final: com vários
    // campos inválidos ao mesmo tempo, cada um deve aparecer em sua própria
    // linha. Verificamos a contagem de linhas (e não só `.includes(...)`),
    // porque duas issues concatenadas sem separador ainda conteriam ambos os
    // nomes de campo, só que numa linha só.
    try {
      validateEnv({ ...validConfig, NODE_ENV: 'staging', PORT: '-1' });
      throw new Error('expected validateEnv to throw');
    } catch (error) {
      const lines = (error as Error).message.split('\n');

      expect(lines).toHaveLength(3);
      expect(lines[1]).toContain('NODE_ENV');
      expect(lines[2]).toContain('PORT');
    }
  });
});
