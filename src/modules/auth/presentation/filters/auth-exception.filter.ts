import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthDomainError } from '../../domain/errors/auth-domain.error';
import { InactiveAccountError } from '../../domain/errors/inactive-account.error';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import { InvalidRefreshTokenError } from '../../domain/errors/invalid-refresh-token.error';
import { InvalidTokenError } from '../../domain/errors/invalid-token.error';
import { RegistrationNotAllowedError } from '../../domain/errors/registration-not-allowed.error';
import { AUTH_MESSAGES } from '../messages/auth.messages.pt-br';

/*
 * Maps internal (English) domain errors to the external (PT-BR) HTTP
 * response. This is the only place that decision is made — nothing else in
 * the auth module builds a Nest HttpException by hand.
 */
@Catch(AuthDomainError)
export class AuthExceptionFilter implements ExceptionFilter {
  catch(error: AuthDomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const httpException = this.toHttpException(error);

    response
      .status(httpException.getStatus())
      .json(httpException.getResponse());
  }

  private toHttpException(error: AuthDomainError): HttpException {
    if (
      error instanceof InvalidCredentialsError ||
      error instanceof InactiveAccountError
    ) {
      return new UnauthorizedException(AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    if (
      error instanceof InvalidRefreshTokenError ||
      error instanceof InvalidTokenError
    ) {
      return new UnauthorizedException(AUTH_MESSAGES.SESSION_EXPIRED);
    }

    if (error instanceof RegistrationNotAllowedError) {
      return new ForbiddenException(AUTH_MESSAGES.REGISTRATION_NOT_ALLOWED);
    }

    return new HttpException(
      AUTH_MESSAGES.UNEXPECTED_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
