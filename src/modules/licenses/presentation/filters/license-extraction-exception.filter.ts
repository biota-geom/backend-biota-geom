import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  GatewayTimeoutException,
  HttpException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Response } from 'express';
import { LicenseExtractionTimeoutError } from '../../domain/errors/license-extraction-timeout.error';
import { LicenseExtractionUnavailableError } from '../../domain/errors/license-extraction-unavailable.error';
import { UnreadableLicenseDocumentError } from '../../domain/errors/unreadable-license-document.error';
import { LICENSES_MESSAGES } from '../messages/licenses.messages.pt-br';

type LicenseExtractionError =
  | UnreadableLicenseDocumentError
  | LicenseExtractionUnavailableError
  | LicenseExtractionTimeoutError;

/*
 * Every extraction failure gets a generic PT-BR message: the internal reason
 * (provider error name, validation detail) stays in the logs, never in the
 * response. The client only needs to know whether to retry or fill the form
 * manually.
 */
@Catch(
  UnreadableLicenseDocumentError,
  LicenseExtractionUnavailableError,
  LicenseExtractionTimeoutError,
)
export class LicenseExtractionExceptionFilter implements ExceptionFilter {
  catch(error: LicenseExtractionError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const httpException = this.toHttpException(error);

    response
      .status(httpException.getStatus())
      .json(httpException.getResponse());
  }

  private toHttpException(error: LicenseExtractionError): HttpException {
    if (error instanceof UnreadableLicenseDocumentError) {
      return new UnprocessableEntityException(
        LICENSES_MESSAGES.EXTRACTION_UNREADABLE,
      );
    }

    if (error instanceof LicenseExtractionTimeoutError) {
      return new GatewayTimeoutException(LICENSES_MESSAGES.EXTRACTION_TIMEOUT);
    }

    return new ServiceUnavailableException(
      LICENSES_MESSAGES.EXTRACTION_UNAVAILABLE,
    );
  }
}
