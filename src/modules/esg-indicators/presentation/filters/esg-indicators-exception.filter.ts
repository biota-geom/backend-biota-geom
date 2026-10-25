import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { AUTH_MESSAGES } from '../../../auth/presentation/messages/auth.messages.pt-br';
import { CustomerNotFoundError } from '../../../customers/domain/errors/customer-not-found.error';
import { DuplicatedIndicatorRecordError } from '../../domain/errors/duplicated-indicator-record.error';
import { IndicatorAlreadyExistsError } from '../../domain/errors/indicator-already-exists.error';
import { IndicatorNotConfiguredError } from '../../domain/errors/indicator-not-configured.error';
import { InvalidReferenceMonthError } from '../../domain/errors/invalid-reference-month.error';
import { ESG_INDICATORS_MESSAGES } from '../messages/esg-indicators.messages.pt-br';

type EsgIndicatorsDomainError =
  | CustomerNotFoundError
  | InvalidReferenceMonthError
  | IndicatorNotConfiguredError
  | DuplicatedIndicatorRecordError
  | IndicatorAlreadyExistsError;

@Catch(
  CustomerNotFoundError,
  InvalidReferenceMonthError,
  IndicatorNotConfiguredError,
  DuplicatedIndicatorRecordError,
  IndicatorAlreadyExistsError,
)
export class EsgIndicatorsExceptionFilter implements ExceptionFilter {
  catch(error: EsgIndicatorsDomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const httpException = this.toHttpException(error);

    response
      .status(httpException.getStatus())
      .json(httpException.getResponse());
  }

  private toHttpException(error: EsgIndicatorsDomainError): HttpException {
    // An unknown customer and one owned by someone else share this 404.
    if (error instanceof CustomerNotFoundError) {
      return new NotFoundException(AUTH_MESSAGES.CUSTOMER_NOT_FOUND);
    }

    if (error instanceof IndicatorAlreadyExistsError) {
      return new ConflictException(
        ESG_INDICATORS_MESSAGES.INDICATOR_ALREADY_EXISTS,
      );
    }

    if (error instanceof IndicatorNotConfiguredError) {
      return new BadRequestException(
        ESG_INDICATORS_MESSAGES.INDICATOR_NOT_CONFIGURED,
      );
    }

    if (error instanceof DuplicatedIndicatorRecordError) {
      return new BadRequestException(
        ESG_INDICATORS_MESSAGES.DUPLICATED_INDICATOR_RECORD,
      );
    }

    return new BadRequestException(ESG_INDICATORS_MESSAGES.INVALID_MONTH);
  }
}
