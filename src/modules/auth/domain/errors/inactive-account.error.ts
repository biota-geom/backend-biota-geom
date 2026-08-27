import { AuthDomainError } from './auth-domain.error';

// Deliberately mapped to the exact same HTTP response as InvalidCredentialsError
// (see auth-exception.filter.ts) so a deactivated account is indistinguishable
// from a wrong password to the end user. Kept as its own class purely so the
// distinction is still visible in structured logs.
export class InactiveAccountError extends AuthDomainError {
  constructor() {
    super('User account is inactive');
    this.name = 'InactiveAccountError';
  }
}
