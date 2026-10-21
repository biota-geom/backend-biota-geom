import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Response } from 'express';
import { AUTH_MESSAGES } from '../../../auth/presentation/messages/auth.messages.pt-br';
import { CustomerNotFoundError } from '../../../customers/domain/errors/customer-not-found.error';
import { DocumentFolderAlreadyExistsError } from '../../domain/errors/document-folder-already-exists.error';
import { DocumentFolderNotFoundError } from '../../domain/errors/document-folder-not-found.error';
import { DocumentNotFoundError } from '../../domain/errors/document-not-found.error';

@Catch(
  CustomerNotFoundError,
  DocumentNotFoundError,
  DocumentFolderNotFoundError,
  DocumentFolderAlreadyExistsError,
  PayloadTooLargeException,
)
export class DocumentsExceptionFilter implements ExceptionFilter {
  catch(
    error:
      | CustomerNotFoundError
      | DocumentNotFoundError
      | DocumentFolderNotFoundError
      | DocumentFolderAlreadyExistsError
      | PayloadTooLargeException,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();
    const exception =
      error instanceof PayloadTooLargeException
        ? new UnprocessableEntityException(
            AUTH_MESSAGES.DOCUMENT_FILE_TOO_LARGE,
          )
        : error instanceof DocumentNotFoundError
          ? new NotFoundException(AUTH_MESSAGES.DOCUMENT_NOT_FOUND)
          : error instanceof DocumentFolderNotFoundError
            ? new NotFoundException(AUTH_MESSAGES.DOCUMENT_FOLDER_NOT_FOUND)
            : error instanceof DocumentFolderAlreadyExistsError
              ? new ConflictException(
                  AUTH_MESSAGES.DOCUMENT_FOLDER_ALREADY_EXISTS,
                )
              : new NotFoundException(AUTH_MESSAGES.CUSTOMER_NOT_FOUND);

    response.status(exception.getStatus()).json(exception.getResponse());
  }
}
