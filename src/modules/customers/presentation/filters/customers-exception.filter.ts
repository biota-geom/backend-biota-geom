import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Response } from 'express';
import { AUTH_MESSAGES } from '../../../auth/presentation/messages/auth.messages.pt-br';
import { CustomerAlreadyExistsError } from '../../domain/errors/customer-already-exists.error';
import { SectorNotFoundError } from '../../domain/errors/sector-not-found.error';

type CustomerDomainError = CustomerAlreadyExistsError | SectorNotFoundError;

@Catch(CustomerAlreadyExistsError, SectorNotFoundError)
export class CustomersExceptionFilter implements ExceptionFilter {
  catch(error: CustomerDomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const httpException = this.toHttpException(error);

    response
      .status(httpException.getStatus())
      .json(httpException.getResponse());
  }

  private toHttpException(error: CustomerDomainError): HttpException {
    if (error instanceof CustomerAlreadyExistsError) {
      return new ConflictException(
        AUTH_MESSAGES.CUSTOMER_DOCUMENT_ALREADY_EXISTS,
      );
    }

    return new UnprocessableEntityException(AUTH_MESSAGES.SECTOR_NOT_FOUND);
  }
}
