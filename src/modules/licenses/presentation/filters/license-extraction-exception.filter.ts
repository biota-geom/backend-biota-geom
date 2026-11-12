import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { LicenseExtractionJobNotFoundError } from '../../domain/errors/license-extraction-job-not-found.error';
import { LICENSES_MESSAGES } from '../messages/licenses.messages.pt-br';

/*
 * Extraction failures are reported through the job (`status: FAILED`), so the
 * only extraction error that reaches HTTP is a job the caller cannot see:
 * unknown, expired, or owned by another user.
 */
@Catch(LicenseExtractionJobNotFoundError)
export class LicenseExtractionExceptionFilter implements ExceptionFilter {
  catch(_error: LicenseExtractionJobNotFoundError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const httpException = new NotFoundException(
      LICENSES_MESSAGES.EXTRACTION_JOB_NOT_FOUND,
    );

    response
      .status(httpException.getStatus())
      .json(httpException.getResponse());
  }
}
