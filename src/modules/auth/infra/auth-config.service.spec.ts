import { ConfigService } from '@nestjs/config';
import { EnvVars } from '../../../config/env.validation';
import { AuthConfigService } from './auth-config.service';

function buildService(env: Record<string, string>) {
  const config = {
    get: (key: string) => env[key],
  } as unknown as ConfigService<EnvVars, true>;

  return new AuthConfigService(config);
}

describe('AuthConfigService', () => {
  it('reads every simple getter from ConfigService', () => {
    const service = buildService({
      JWT_ACCESS_SECRET: 'access-secret',
      JWT_REFRESH_SECRET: 'refresh-secret',
      JWT_ACCESS_TTL: '15m',
      JWT_REFRESH_TTL: '7d',
      JWT_ISSUER: 'biota-geom-api',
      JWT_AUDIENCE: 'biota-geom-web',
      AUTH_ALLOWED_EMAIL_DOMAIN: 'biotageom.com.br',
      CORS_ORIGINS: 'http://localhost:5173',
    });

    expect(service.accessSecret).toBe('access-secret');
    expect(service.refreshSecret).toBe('refresh-secret');
    expect(service.accessTtl).toBe('15m');
    expect(service.refreshTtl).toBe('7d');
    expect(service.issuer).toBe('biota-geom-api');
    expect(service.audience).toBe('biota-geom-web');
    expect(service.allowedEmailDomain).toBe('biotageom.com.br');
  });

  it('derives accessTtlSeconds from accessTtl', () => {
    const service = buildService({ JWT_ACCESS_TTL: '15m' });

    expect(service.accessTtlSeconds).toBe(900);
  });

  it('parses a single CORS origin', () => {
    const service = buildService({ CORS_ORIGINS: 'http://localhost:5173' });

    expect(service.corsOrigins).toEqual(['http://localhost:5173']);
  });

  it('splits, trims, and drops empty entries from a comma-separated CORS origin list', () => {
    const service = buildService({
      CORS_ORIGINS: 'http://localhost:5173, https://app.biotageom.com.br ,,',
    });

    expect(service.corsOrigins).toEqual([
      'http://localhost:5173',
      'https://app.biotageom.com.br',
    ]);
  });
});
