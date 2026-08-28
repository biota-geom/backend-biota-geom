import { JwtService } from '@nestjs/jwt';
import { AuthConfigService } from './auth-config.service';
import { JwtTokenService } from './jwt-token.service';

function buildService() {
  const jwt = new JwtService();
  const authConfig = {
    accessSecret: 'a'.repeat(32),
    refreshSecret: 'b'.repeat(32),
    accessTtl: '15m',
    refreshTtl: '7d',
    accessTtlSeconds: 900,
    issuer: 'biota-geom-api',
    audience: 'biota-geom-web',
  } as unknown as AuthConfigService;

  return new JwtTokenService(jwt, authConfig);
}

describe('JwtTokenService', () => {
  it('round-trips an access token', async () => {
    const service = buildService();
    const token = await service.issueAccessToken('user-1');

    const payload = await service.verifyAccessToken(token);

    expect(payload.sub).toBe('user-1');
    expect(payload.typ).toBe('access');
  });

  it('round-trips a refresh token', async () => {
    const service = buildService();
    const token = await service.issueRefreshToken('user-1');

    const payload = await service.verifyRefreshToken(token);

    expect(payload.sub).toBe('user-1');
    expect(payload.typ).toBe('refresh');
  });

  it('rejects an access token when a refresh token is expected', async () => {
    const service = buildService();
    const token = await service.issueAccessToken('user-1');

    await expect(service.verifyRefreshToken(token)).rejects.toThrow();
  });

  it('rejects a refresh token when an access token is expected', async () => {
    const service = buildService();
    const token = await service.issueRefreshToken('user-1');

    await expect(service.verifyAccessToken(token)).rejects.toThrow();
  });

  it('rejects a validly-signed access token whose typ claim was tampered with', async () => {
    const service = buildService();
    const jwt = new JwtService();
    const tamperedToken = await jwt.signAsync(
      { sub: 'user-1', typ: 'refresh' },
      {
        secret: 'a'.repeat(32),
        issuer: 'biota-geom-api',
        audience: 'biota-geom-web',
      },
    );

    await expect(service.verifyAccessToken(tamperedToken)).rejects.toThrow(
      'Expected a "access" token but got "refresh"',
    );
  });

  it('rejects a token signed with a different issuer/audience', async () => {
    const service = buildService();
    const otherJwt = new JwtService();
    const rogueToken = await otherJwt.signAsync(
      { sub: 'user-1', typ: 'access' },
      {
        secret: 'a'.repeat(32),
        issuer: 'someone-else',
        audience: 'biota-geom-web',
      },
    );

    await expect(service.verifyAccessToken(rogueToken)).rejects.toThrow();
  });

  it('rejects an expired token', async () => {
    const service = buildService();
    const jwt = new JwtService();
    const expiredToken = await jwt.signAsync(
      { sub: 'user-1', typ: 'access' },
      {
        secret: 'a'.repeat(32),
        issuer: 'biota-geom-api',
        audience: 'biota-geom-web',
        expiresIn: '-1s',
      },
    );

    await expect(service.verifyAccessToken(expiredToken)).rejects.toThrow();
  });

  it('reports the configured access token TTL in seconds', () => {
    const service = buildService();

    expect(service.getAccessTokenTtlSeconds()).toBe(900);
  });
});
