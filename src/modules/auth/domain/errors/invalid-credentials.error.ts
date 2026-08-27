import { AuthDomainError } from './auth-domain.error';

export class InvalidCredentialsError extends AuthDomainError {
  constructor() {
    super('Invalid login credentials');
    this.name = 'InvalidCredentialsError';
  }
}
