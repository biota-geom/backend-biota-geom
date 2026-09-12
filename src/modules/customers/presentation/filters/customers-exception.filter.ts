import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { AUTH_MESSAGES } from '../../../auth/presentation/messages/auth.messages.pt-br';
import { CustomerAddressNotFoundError } from '../../domain/errors/customer-address-not-found.error';
import { CustomerNotFoundError } from '../../domain/errors/customer-not-found.error';
import { InvalidEsgIndicatorIdsError } from '../../domain/errors/invalid-esg-indicator-ids.error';

type CustomersDomainError =
  | CustomerNotFoundError
  | CustomerAddressNotFoundError
  | InvalidEsgIndicatorIdsError;

@Catch(
  CustomerNotFoundError,
  CustomerAddressNotFoundError,
  InvalidEsgIndicatorIdsError,
)
export class CustomersExceptionFilter implements ExceptionFilter {
  catch(error: CustomersDomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const httpException = this.toHttpException(error);

    response
      .status(httpException.getStatus())
      .json(httpException.getResponse());
  }

  private toHttpException(
    error: CustomersDomainError,
  ): NotFoundException | BadRequestException {
    if (error instanceof CustomerNotFoundError) {
      return new NotFoundException(AUTH_MESSAGES.CUSTOMER_NOT_FOUND);
    }

    if (error instanceof CustomerAddressNotFoundError) {
      return new BadRequestException(AUTH_MESSAGES.CUSTOMER_ADDRESS_NOT_FOUND);
    }

    return new BadRequestException(AUTH_MESSAGES.INVALID_ESG_INDICATOR_IDS);
  }
}
