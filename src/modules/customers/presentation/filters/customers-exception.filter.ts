import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Response } from 'express';
import { AUTH_MESSAGES } from '../../../auth/presentation/messages/auth.messages.pt-br';
import { CustomerAddressNotFoundError } from '../../domain/errors/customer-address-not-found.error';
import { CustomerAlreadyExistsError } from '../../domain/errors/customer-already-exists.error';
import { CustomerNotFoundError } from '../../domain/errors/customer-not-found.error';
import { EsgMetricsNotFoundError } from '../../domain/errors/esg-metrics-not-found.error';
import { SectorNotFoundError } from '../../domain/errors/sector-not-found.error';

type CustomersDomainError =
  | CustomerNotFoundError
  | CustomerAddressNotFoundError
  | EsgMetricsNotFoundError
  | CustomerAlreadyExistsError
  | SectorNotFoundError;

@Catch(
  CustomerNotFoundError,
  CustomerAddressNotFoundError,
  EsgMetricsNotFoundError,
  CustomerAlreadyExistsError,
  SectorNotFoundError,
)
export class CustomersExceptionFilter implements ExceptionFilter {
  catch(error: CustomersDomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const httpException = this.toHttpException(error);

    response
      .status(httpException.getStatus())
      .json(httpException.getResponse());
  }

  private toHttpException(error: CustomersDomainError): HttpException {
    if (error instanceof CustomerNotFoundError) {
      return new NotFoundException(AUTH_MESSAGES.CUSTOMER_NOT_FOUND);
    }

    if (error instanceof CustomerAddressNotFoundError) {
      return new BadRequestException(AUTH_MESSAGES.CUSTOMER_ADDRESS_NOT_FOUND);
    }

    if (error instanceof CustomerAlreadyExistsError) {
      return new ConflictException(
        AUTH_MESSAGES.CUSTOMER_DOCUMENT_ALREADY_EXISTS,
      );
    }

    if (error instanceof SectorNotFoundError) {
      return new UnprocessableEntityException(AUTH_MESSAGES.SECTOR_NOT_FOUND);
    }

    return new BadRequestException(AUTH_MESSAGES.ESG_METRICS_NOT_FOUND);
  }
}
