import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { LicenseLegislationNotFoundError } from '../../domain/errors/license-legislation-not-found.error';
import { LEGISLATIONS_MESSAGES } from '../messages/legislations.messages.pt-br';

// A missing license is handled by LicensesExceptionFilter; this one only
// covers the legislation link, so the two compose on the same controller.
@Catch(LicenseLegislationNotFoundError)
export class LegislationsExceptionFilter implements ExceptionFilter {
  catch(_error: LicenseLegislationNotFoundError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const exception = new NotFoundException(
      LEGISLATIONS_MESSAGES.LEGISLATION_NOT_FOUND,
    );

    response.status(exception.getStatus()).json(exception.getResponse());
  }
}
