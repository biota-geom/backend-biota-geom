import { AuthDomainError } from './auth-domain.error';

export type RegistrationDeniedReason =
  'domain_not_allowed' | 'email_already_registered';

// Both reasons are deliberately mapped to the same HTTP response (see
// auth-exception.filter.ts) so the allowed-email-domain rule can't be
// inferred by comparing the error returned for a disallowed domain against
// the one returned for a duplicate email on an allowed domain. `reason` is
// for structured logging only — it must never reach the HTTP response.
export class RegistrationNotAllowedError extends AuthDomainError {
  constructor(public readonly reason: RegistrationDeniedReason) {
    super('Registration was denied');
    this.name = 'RegistrationNotAllowedError';
  }
}
