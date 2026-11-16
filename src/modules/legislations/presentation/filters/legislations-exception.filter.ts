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
import { InvalidLegislationReferenceError } from '../../domain/errors/invalid-legislation-reference.error';
import { LegislationAlreadyLinkedError } from '../../domain/errors/legislation-already-linked.error';
import { LegislationNotFoundError } from '../../domain/errors/legislation-not-found.error';
import { LicenseLegislationNotFoundError } from '../../domain/errors/license-legislation-not-found.error';
import { SharedLegislationNotEditableError } from '../../domain/errors/shared-legislation-not-editable.error';
import { LEGISLATIONS_MESSAGES } from '../messages/legislations.messages.pt-br';

type LegislationsDomainError =
  | InvalidLegislationReferenceError
  | LegislationAlreadyLinkedError
  | LegislationNotFoundError
  | LicenseLegislationNotFoundError
  | SharedLegislationNotEditableError;

@Catch(
  InvalidLegislationReferenceError,
  LegislationAlreadyLinkedError,
  LegislationNotFoundError,
  LicenseLegislationNotFoundError,
  SharedLegislationNotEditableError,
)
export class LegislationsExceptionFilter implements ExceptionFilter {
  catch(error: LegislationsDomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const httpException = this.toHttpException(error);

    response
      .status(httpException.getStatus())
      .json(httpException.getResponse());
  }

  private toHttpException(error: LegislationsDomainError): HttpException {
    if (error instanceof LegislationNotFoundError) {
      return new NotFoundException(LEGISLATIONS_MESSAGES.LEGISLATION_NOT_FOUND);
    }

    if (error instanceof LicenseLegislationNotFoundError) {
      return new NotFoundException(
        LEGISLATIONS_MESSAGES.LICENSE_LEGISLATION_NOT_FOUND,
      );
    }

    if (error instanceof LegislationAlreadyLinkedError) {
      return new ConflictException(
        LEGISLATIONS_MESSAGES.LEGISLATION_ALREADY_LINKED,
      );
    }

    if (error instanceof SharedLegislationNotEditableError) {
      return new ConflictException(
        LEGISLATIONS_MESSAGES.SHARED_LEGISLATION_NOT_EDITABLE,
      );
    }

    return new BadRequestException(
      LEGISLATIONS_MESSAGES.INVALID_LEGISLATION_REFERENCE,
    );
  }
}
