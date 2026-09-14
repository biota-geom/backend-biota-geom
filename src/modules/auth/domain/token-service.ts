export type TokenType = 'access' | 'refresh';

export interface TokenPayload {
  sub: string;
  typ: TokenType;
}

export abstract class TokenService {
  abstract issueAccessToken(userId: string): Promise<string>;
  abstract issueRefreshToken(userId: string): Promise<string>;
  abstract verifyAccessToken(token: string): Promise<TokenPayload>;
  abstract verifyRefreshToken(token: string): Promise<TokenPayload>;
  abstract getAccessTokenTtlSeconds(): number;
}
