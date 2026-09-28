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
import { LicenseConditionNotFoundError } from '../../domain/errors/license-condition-not-found.error';
import { LicenseNotFoundError } from '../../domain/errors/license-not-found.error';
import { LICENSES_MESSAGES } from '../messages/licenses.messages.pt-br';

type LicensesDomainError =
  | CustomerNotFoundError
  | IssuingAgencyNotFoundError
  | InvalidLicenseDateRangeError
  | LicenseConditionNotFoundError
  | LicenseNotFoundError;

@Catch(
  CustomerNotFoundError,
  IssuingAgencyNotFoundError,
  InvalidLicenseDateRangeError,
  LicenseConditionNotFoundError,
  LicenseNotFoundError,
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

    /*
     * And the same reasoning one level down: a condition that does not exist
     * and one belonging to another company both end here, as the same 404.
     */
    if (error instanceof LicenseConditionNotFoundError) {
      return new NotFoundException(
        LICENSES_MESSAGES.LICENSE_CONDITION_NOT_FOUND,
      );
    }

    if (error instanceof IssuingAgencyNotFoundError) {
      return new UnprocessableEntityException(
        LICENSES_MESSAGES.ISSUING_AGENCY_NOT_FOUND,
      );
    }

    /*
     * 422, not 404: the condition being edited was found — it is the license
     * named in the body that cannot be linked, which is a rejected value in
     * a well-formed request, exactly like an unknown issuing agency.
     */
    if (error instanceof LicenseNotFoundError) {
      return new UnprocessableEntityException(
        LICENSES_MESSAGES.LICENSE_NOT_FOUND,
      );
    }

    return new BadRequestException(LICENSES_MESSAGES.INVALID_DATE_RANGE);
  }
}
