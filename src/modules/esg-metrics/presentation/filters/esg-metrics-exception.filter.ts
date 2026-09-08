import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
} from '@nestjs/common';
import { Response } from 'express';
import { AUTH_MESSAGES } from '../../../auth/presentation/messages/auth.messages.pt-br';
import { EsgMetricAlreadyExistsError } from '../../domain/errors/esg-metric-already-exists.error';

@Catch(EsgMetricAlreadyExistsError)
export class EsgMetricsExceptionFilter implements ExceptionFilter {
  catch(error: EsgMetricAlreadyExistsError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const httpException = new ConflictException(
      AUTH_MESSAGES.ESG_METRIC_NAME_ALREADY_EXISTS,
    );

    response
      .status(httpException.getStatus())
      .json(httpException.getResponse());
  }
}
