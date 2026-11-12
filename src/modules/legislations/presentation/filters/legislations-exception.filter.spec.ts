import { ArgumentsHost } from '@nestjs/common';
import { InvalidLegislationReferenceError } from '../../domain/errors/invalid-legislation-reference.error';
import { LegislationAlreadyLinkedError } from '../../domain/errors/legislation-already-linked.error';
import { LegislationNotFoundError } from '../../domain/errors/legislation-not-found.error';
import { LicenseLegislationNotFoundError } from '../../domain/errors/license-legislation-not-found.error';
import { SharedLegislationNotEditableError } from '../../domain/errors/shared-legislation-not-editable.error';
import { LEGISLATIONS_MESSAGES } from '../messages/legislations.messages.pt-br';
import { LegislationsExceptionFilter } from './legislations-exception.filter';

function catchError(error: Error) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;

  new LegislationsExceptionFilter().catch(error, host);

  return { status, json };
}

describe('LegislationsExceptionFilter', () => {
  it.each([
    [
      new LegislationNotFoundError('legislation-1'),
      404,
      LEGISLATIONS_MESSAGES.LEGISLATION_NOT_FOUND,
    ],
    [
      new LicenseLegislationNotFoundError('link-1'),
      404,
      LEGISLATIONS_MESSAGES.LICENSE_LEGISLATION_NOT_FOUND,
    ],
    [
      new LegislationAlreadyLinkedError('legislation-1'),
      409,
      LEGISLATIONS_MESSAGES.LEGISLATION_ALREADY_LINKED,
    ],
    [
      new SharedLegislationNotEditableError('legislation-1'),
      409,
      LEGISLATIONS_MESSAGES.SHARED_LEGISLATION_NOT_EDITABLE,
    ],
    [
      new InvalidLegislationReferenceError(),
      400,
      LEGISLATIONS_MESSAGES.INVALID_LEGISLATION_REFERENCE,
    ],
  ])('maps %s to %i', (error, statusCode, message) => {
    const { status, json } = catchError(error);

    expect(status).toHaveBeenCalledWith(statusCode);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode, message }),
    );
  });
});
