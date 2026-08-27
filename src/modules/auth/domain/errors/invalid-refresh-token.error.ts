import { AuthDomainError } from './auth-domain.error';

export class InvalidRefreshTokenError extends AuthDomainError {
  constructor() {
    super('Refresh token is invalid or expired');
    this.name = 'InvalidRefreshTokenError';
  }
}
