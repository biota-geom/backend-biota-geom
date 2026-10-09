import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  NotFoundException,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Response } from 'express';
import { AUTH_MESSAGES } from '../../../auth/presentation/messages/auth.messages.pt-br';
import { CustomerNotFoundError } from '../../../customers/domain/errors/customer-not-found.error';

@Catch(CustomerNotFoundError, PayloadTooLargeException)
export class DocumentsExceptionFilter implements ExceptionFilter {
  catch(
    error: CustomerNotFoundError | PayloadTooLargeException,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();
    const exception =
      error instanceof PayloadTooLargeException
        ? new UnprocessableEntityException(
            AUTH_MESSAGES.DOCUMENT_FILE_TOO_LARGE,
          )
        : new NotFoundException(AUTH_MESSAGES.CUSTOMER_NOT_FOUND);

    response.status(exception.getStatus()).json(exception.getResponse());
  }
}
