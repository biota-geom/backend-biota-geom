import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { AUTH_MESSAGES } from '../../../auth/presentation/messages/auth.messages.pt-br';
import { CustomerNotFoundError } from '../../../customers/domain/errors/customer-not-found.error';
import { InvalidConditionDueDateError } from '../../domain/errors/invalid-condition-due-date.error';
import { InvalidLicenseDateRangeError } from '../../domain/errors/invalid-license-date-range.error';
import { LicenseConditionLicenseMismatchError } from '../../domain/errors/license-condition-license-mismatch.error';
import { LicenseNotFoundError } from '../../domain/errors/license-not-found.error';
import { DuplicateRenewalConditionError } from '../../domain/errors/duplicate-renewal-condition.error';
import { InvalidRenewalDueDateError } from '../../domain/errors/invalid-renewal-due-date.error';
import { RenewalConditionsOutdatedError } from '../../domain/errors/renewal-conditions-outdated.error';
import { LICENSES_MESSAGES } from '../messages/licenses.messages.pt-br';
import { LicensesExceptionFilter } from './licenses-exception.filter';

function buildHost(): {
  host: ArgumentsHost;
  status: jest.Mock;
  json: jest.Mock;
} {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('LicensesExceptionFilter', () => {
  const filter = new LicensesExceptionFilter();

  it('maps CustomerNotFoundError to 404', () => {
    const { host, status, json } = buildHost();

    filter.catch(new CustomerNotFoundError('customer-1'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: AUTH_MESSAGES.CUSTOMER_NOT_FOUND }),
    );
  });

  it('maps InvalidLicenseDateRangeError to 400', () => {
    const { host, status, json } = buildHost();

    filter.catch(new InvalidLicenseDateRangeError(), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: LICENSES_MESSAGES.INVALID_DATE_RANGE,
      }),
    );
  });

  it('maps LicenseNotFoundError to 404', () => {
    const { host, status, json } = buildHost();

    filter.catch(new LicenseNotFoundError('license-1'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: LICENSES_MESSAGES.LICENSE_NOT_FOUND }),
    );
  });

  it('maps a route/body license mismatch to 400', () => {
    const { host, status, json } = buildHost();

    filter.catch(new LicenseConditionLicenseMismatchError(), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: LICENSES_MESSAGES.CONDITION_LICENSE_MISMATCH,
      }),
    );
  });

  it('maps an invalid condition due date to 400', () => {
    const { host, status, json } = buildHost();

    filter.catch(new InvalidConditionDueDateError(), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      message: LICENSES_MESSAGES.CONDITION_DUE_DATE_REQUIRED,
      error: 'Bad Request',
    });
  });

  it('maps RenewalConditionsOutdatedError to 409 so the client reloads the list', () => {
    const { host, status, json } = buildHost();

    filter.catch(new RenewalConditionsOutdatedError(), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: LICENSES_MESSAGES.RENEWAL_CONDITIONS_OUTDATED,
      }),
    );
  });

  it.each([
    [
      new DuplicateRenewalConditionError(),
      LICENSES_MESSAGES.RENEWAL_CONDITION_DUPLICATED,
    ],
    [
      new InvalidRenewalDueDateError(),
      LICENSES_MESSAGES.RENEWAL_COPY_DUE_DATE_INVALID,
    ],
  ])('maps %p to 400', (error, message) => {
    const { host, status, json } = buildHost();

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ message }));
  });
});
