import { AuthDomainError } from './auth-domain.error';

/*
 * Generic "this JWT can't be trusted" error — wrong type (access presented
 * as refresh or vice versa), or a token whose subject no longer resolves to
 * a usable user. Kept distinct from InvalidRefreshTokenError, which is
 * specifically about the /auth/refresh flow; this covers call sites (token
 * verification itself, /auth/me) that never touch a refresh token at all.
 */
export class InvalidTokenError extends AuthDomainError {
  constructor(message = 'Token is invalid') {
    super(message);
    this.name = 'InvalidTokenError';
  }
}
