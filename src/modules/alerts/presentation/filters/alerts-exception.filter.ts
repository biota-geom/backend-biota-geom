import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { AlertNotFoundError } from '../../domain/errors/alert-not-found.error';
import { ALERT_MESSAGES } from '../../../auth/presentation/messages/auth.messages.pt-br';

@Catch(AlertNotFoundError)
export class AlertsExceptionFilter implements ExceptionFilter {
  catch(_error: AlertNotFoundError, host: ArgumentsHost) {
    const error = new NotFoundException(ALERT_MESSAGES.NOT_FOUND);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(error.getStatus())
      .json(error.getResponse());
  }
}
