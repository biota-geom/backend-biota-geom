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
import { ConditionCategoryNotFoundError } from '../../domain/errors/condition-category-not-found.error';
import { ConditionCategoryNotLinkedError } from '../../domain/errors/condition-category-not-linked.error';
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
  | LicenseConditionLicenseMismatchError
  | ConditionCategoryNotFoundError
  | ConditionCategoryNotLinkedError;

@Catch(
  CustomerNotFoundError,
  IssuingAgencyNotFoundError,
  InvalidLicenseDateRangeError,
  LicenseNotFoundError,
  LicenseConditionLicenseMismatchError,
  ConditionCategoryNotFoundError,
  ConditionCategoryNotLinkedError,
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

    /*
     * An unknown GRI parameter and another account's private one share this
     * 404 on purpose, so the existence of other tenants' parameters is never
     * revealed.
     */
    if (error instanceof ConditionCategoryNotFoundError) {
      return new NotFoundException(
        LICENSES_MESSAGES.CONDITION_CATEGORY_NOT_FOUND,
      );
    }

    if (error instanceof ConditionCategoryNotLinkedError) {
      return new UnprocessableEntityException(
        LICENSES_MESSAGES.CONDITION_CATEGORY_NOT_LINKED,
      );
    }

    return new BadRequestException(LICENSES_MESSAGES.INVALID_DATE_RANGE);
  }
}
