import { PasswordHasher } from '../../domain/password-hasher';
import { TokenPayload, TokenService } from '../../domain/token-service';

export class FakePasswordHasher implements PasswordHasher {
  public verifyCallCount = 0;

  hash(plainPassword: string): Promise<string> {
    return Promise.resolve(`hashed:${plainPassword}`);
  }

  verify(passwordHash: string, plainPassword: string): Promise<boolean> {
    this.verifyCallCount += 1;
    return Promise.resolve(passwordHash === `hashed:${plainPassword}`);
  }
}

export class FakeTokenService implements TokenService {
  public issuedAccessTokensFor: string[] = [];
  public issuedRefreshTokensFor: string[] = [];
  private readonly refreshTokensByUserId = new Map<string, string>();

  issueAccessToken(userId: string): Promise<string> {
    this.issuedAccessTokensFor.push(userId);
    return Promise.resolve(`access:${userId}`);
  }

  issueRefreshToken(userId: string): Promise<string> {
    this.issuedRefreshTokensFor.push(userId);
    const token = `refresh:${userId}`;
    this.refreshTokensByUserId.set(token, userId);
    return Promise.resolve(token);
  }

  verifyAccessToken(token: string): Promise<TokenPayload> {
    if (!token.startsWith('access:')) {
      return Promise.reject(new Error('not an access token'));
    }
    return Promise.resolve({
      sub: token.slice('access:'.length),
      typ: 'access',
    });
  }

  verifyRefreshToken(token: string): Promise<TokenPayload> {
    const userId = this.refreshTokensByUserId.get(token);
    if (!userId) {
      return Promise.reject(new Error('invalid refresh token'));
    }
    return Promise.resolve({ sub: userId, typ: 'refresh' });
  }

  getAccessTokenTtlSeconds(): number {
    return 900;
  }
}
