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
import { DuplicateRenewalConditionError } from '../../domain/errors/duplicate-renewal-condition.error';
import { InvalidConditionDueDateError } from '../../domain/errors/invalid-condition-due-date.error';
import { InvalidLicenseDateRangeError } from '../../domain/errors/invalid-license-date-range.error';
import { InvalidRenewalDueDateError } from '../../domain/errors/invalid-renewal-due-date.error';
import { LicenseConditionNotFoundError } from '../../domain/errors/license-condition-not-found.error';
import { LicenseConditionLicenseMismatchError } from '../../domain/errors/license-condition-license-mismatch.error';
import { LicenseAlreadyArchivedError } from '../../domain/errors/license-already-archived.error';
import { LicenseNotFoundError } from '../../domain/errors/license-not-found.error';
import { RenewalConditionsOutdatedError } from '../../domain/errors/renewal-conditions-outdated.error';
import { LICENSES_MESSAGES } from '../messages/licenses.messages.pt-br';

type LicensesDomainError =
  | CustomerNotFoundError
  | InvalidLicenseDateRangeError
  | LicenseAlreadyArchivedError
  | LicenseNotFoundError
  | LicenseConditionNotFoundError
  | LicenseConditionLicenseMismatchError
  | InvalidConditionDueDateError
  | RenewalConditionsOutdatedError
  | DuplicateRenewalConditionError
  | InvalidRenewalDueDateError;

@Catch(
  CustomerNotFoundError,
  InvalidLicenseDateRangeError,
  LicenseAlreadyArchivedError,
  LicenseNotFoundError,
  LicenseConditionNotFoundError,
  LicenseConditionLicenseMismatchError,
  InvalidConditionDueDateError,
  RenewalConditionsOutdatedError,
  DuplicateRenewalConditionError,
  InvalidRenewalDueDateError,
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

    if (error instanceof LicenseNotFoundError) {
      return new NotFoundException(LICENSES_MESSAGES.LICENSE_NOT_FOUND);
    }

    if (error instanceof LicenseAlreadyArchivedError) {
      return new BadRequestException(
        LICENSES_MESSAGES.LICENSE_ALREADY_ARCHIVED,
      );
    }

    if (error instanceof LicenseConditionNotFoundError) {
      return new NotFoundException(LICENSES_MESSAGES.CONDITION_NOT_FOUND);
    }

    if (error instanceof LicenseConditionLicenseMismatchError) {
      return new BadRequestException(
        LICENSES_MESSAGES.CONDITION_LICENSE_MISMATCH,
      );
    }

    if (error instanceof InvalidConditionDueDateError) {
      return new BadRequestException(
        LICENSES_MESSAGES.CONDITION_DUE_DATE_REQUIRED,
      );
    }

    // 409: the request was valid when built, but the license's conditions
    // changed since. The client reloads them and asks again.
    if (error instanceof RenewalConditionsOutdatedError) {
      return new ConflictException(
        LICENSES_MESSAGES.RENEWAL_CONDITIONS_OUTDATED,
      );
    }

    if (error instanceof DuplicateRenewalConditionError) {
      return new BadRequestException(
        LICENSES_MESSAGES.RENEWAL_CONDITION_DUPLICATED,
      );
    }

    if (error instanceof InvalidRenewalDueDateError) {
      return new BadRequestException(
        LICENSES_MESSAGES.RENEWAL_COPY_DUE_DATE_INVALID,
      );
    }

    return new BadRequestException(LICENSES_MESSAGES.INVALID_DATE_RANGE);
  }
}
