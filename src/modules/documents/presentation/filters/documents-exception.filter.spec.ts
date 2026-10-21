import { ArgumentsHost, PayloadTooLargeException } from '@nestjs/common';
import { AUTH_MESSAGES } from '../../../auth/presentation/messages/auth.messages.pt-br';
import { CustomerNotFoundError } from '../../../customers/domain/errors/customer-not-found.error';
import { DocumentNotFoundError } from '../../domain/errors/document-not-found.error';
import { DocumentFolderAlreadyExistsError } from '../../domain/errors/document-folder-already-exists.error';
import { DocumentFolderNotFoundError } from '../../domain/errors/document-folder-not-found.error';
import { DocumentsExceptionFilter } from './documents-exception.filter';

describe('DocumentsExceptionFilter', () => {
  function host() {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const argumentsHost = {
      switchToHttp: () => ({ getResponse: () => ({ status, json }) }),
    } as unknown as ArgumentsHost;

    return { argumentsHost, status, json };
  }

  it('maps customer absence to the indistinguishable 404 response', () => {
    const { argumentsHost, status, json } = host();

    new DocumentsExceptionFilter().catch(
      new CustomerNotFoundError('customer-1'),
      argumentsHost,
    );

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: AUTH_MESSAGES.CUSTOMER_NOT_FOUND }),
    );
  });

  it('maps the Multer size limit to the friendly 422 response', () => {
    const { argumentsHost, status, json } = host();

    new DocumentsExceptionFilter().catch(
      new PayloadTooLargeException(),
      argumentsHost,
    );

    expect(status).toHaveBeenCalledWith(422);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: AUTH_MESSAGES.DOCUMENT_FILE_TOO_LARGE,
      }),
    );
  });

  it('maps an inaccessible document to the indistinguishable 404 response', () => {
    const { argumentsHost, status, json } = host();

    new DocumentsExceptionFilter().catch(
      new DocumentNotFoundError('document-1'),
      argumentsHost,
    );

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: AUTH_MESSAGES.DOCUMENT_NOT_FOUND }),
    );
  });

  it('maps an inaccessible folder to a safe 404 response', () => {
    const { argumentsHost, status, json } = host();

    new DocumentsExceptionFilter().catch(
      new DocumentFolderNotFoundError('folder-1'),
      argumentsHost,
    );

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: AUTH_MESSAGES.DOCUMENT_FOLDER_NOT_FOUND,
      }),
    );
  });

  it('maps a duplicate folder name to conflict', () => {
    const { argumentsHost, status, json } = host();

    new DocumentsExceptionFilter().catch(
      new DocumentFolderAlreadyExistsError('Ambiental'),
      argumentsHost,
    );

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: AUTH_MESSAGES.DOCUMENT_FOLDER_ALREADY_EXISTS,
      }),
    );
  });
});
