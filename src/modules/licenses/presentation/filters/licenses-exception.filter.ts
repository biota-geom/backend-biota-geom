import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Response } from 'express';
import { AUTH_MESSAGES } from '../../../auth/presentation/messages/auth.messages.pt-br';
import { CustomerNotFoundError } from '../../../customers/domain/errors/customer-not-found.error';
import { InvalidLicenseDateRangeError } from '../../domain/errors/invalid-license-date-range.error';
import { IssuingAgencyNotFoundError } from '../../domain/errors/issuing-agency-not-found.error';
import { LicenseConditionLicenseMismatchError } from '../../domain/errors/license-condition-license-mismatch.error';
import { LicenseNotFoundError } from '../../domain/errors/license-not-found.error';
import { LICENSES_MESSAGES } from '../messages/licenses.messages.pt-br';

type LicensesDomainError =
  | CustomerNotFoundError
  | IssuingAgencyNotFoundError
  | InvalidLicenseDateRangeError
  | LicenseNotFoundError
  | LicenseConditionLicenseMismatchError;

@Catch(
  CustomerNotFoundError,
  IssuingAgencyNotFoundError,
  InvalidLicenseDateRangeError,
  LicenseNotFoundError,
  LicenseConditionLicenseMismatchError,
)
export class LicensesExceptionFilter implements ExceptionFilter {
  catch(error: LicensesDomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const httpException = this.toHttpException(error);

    response
      .status(httpException.getStatus())
      .json(httpException.getResponse());
  }

  private toHttpException(error: LicensesDomainError): HttpException {
    /*
     * Same 404 as the customers module for the same reason: an unknown
     * customer and one owned by someone else must be indistinguishable to
     * the caller (see CustomerRepository).
     */
    if (error instanceof CustomerNotFoundError) {
      return new NotFoundException(AUTH_MESSAGES.CUSTOMER_NOT_FOUND);
    }

    if (error instanceof IssuingAgencyNotFoundError) {
      return new UnprocessableEntityException(
        LICENSES_MESSAGES.ISSUING_AGENCY_NOT_FOUND,
      );
    }

    if (error instanceof LicenseNotFoundError) {
      return new NotFoundException(LICENSES_MESSAGES.LICENSE_NOT_FOUND);
    }

    if (error instanceof LicenseConditionLicenseMismatchError) {
      return new BadRequestException(
        LICENSES_MESSAGES.CONDITION_LICENSE_MISMATCH,
      );
    }

    return new BadRequestException(LICENSES_MESSAGES.INVALID_DATE_RANGE);
  }
}
