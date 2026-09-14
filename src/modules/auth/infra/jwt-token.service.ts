import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InvalidTokenError } from '../domain/errors/invalid-token.error';
import { TokenPayload, TokenService, TokenType } from '../domain/token-service';
import { AuthConfigService } from './auth-config.service';

@Injectable()
export class JwtTokenService implements TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly authConfig: AuthConfigService,
  ) {}

  async issueAccessToken(userId: string): Promise<string> {
    return this.sign(userId, 'access');
  }

  async issueRefreshToken(userId: string): Promise<string> {
    return this.sign(userId, 'refresh');
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    return this.verify(token, 'access');
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    return this.verify(token, 'refresh');
  }

  getAccessTokenTtlSeconds(): number {
    return this.authConfig.accessTtlSeconds;
  }

  private async sign(userId: string, typ: TokenType): Promise<string> {
    const secret =
      typ === 'access'
        ? this.authConfig.accessSecret
        : this.authConfig.refreshSecret;
    const expiresIn =
      typ === 'access' ? this.authConfig.accessTtl : this.authConfig.refreshTtl;

    return this.jwt.signAsync({ sub: userId, typ }, {
      secret,
      expiresIn,
      issuer: this.authConfig.issuer,
      audience: this.authConfig.audience,
    } as Parameters<JwtService['signAsync']>[1]);
  }

  private async verify(
    token: string,
    expected: TokenType,
  ): Promise<TokenPayload> {
    const secret =
      expected === 'access'
        ? this.authConfig.accessSecret
        : this.authConfig.refreshSecret;

    const payload = await this.jwt.verifyAsync<TokenPayload>(token, {
      secret,
      issuer: this.authConfig.issuer,
      audience: this.authConfig.audience,
    });

    if (payload.typ !== expected) {
      throw new InvalidTokenError(
        `Expected a "${expected}" token but got "${payload.typ}"`,
      );
    }

    return payload;
  }
}
