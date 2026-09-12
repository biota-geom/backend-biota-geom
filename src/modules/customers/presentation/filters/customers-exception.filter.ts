import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { AUTH_MESSAGES } from '../../../auth/presentation/messages/auth.messages.pt-br';
import { CustomerNotFoundError } from '../../domain/errors/customer-not-found.error';
import { EsgMetricsNotFoundError } from '../../domain/errors/esg-metrics-not-found.error';

@Catch(CustomerNotFoundError, EsgMetricsNotFoundError)
export class CustomersExceptionFilter implements ExceptionFilter {
  catch(
    error: CustomerNotFoundError | EsgMetricsNotFoundError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();
    const httpException =
      error instanceof CustomerNotFoundError
        ? new NotFoundException(AUTH_MESSAGES.CUSTOMER_NOT_FOUND)
        : new BadRequestException(AUTH_MESSAGES.ESG_METRICS_NOT_FOUND);

    response
      .status(httpException.getStatus())
      .json(httpException.getResponse());
  }
}
