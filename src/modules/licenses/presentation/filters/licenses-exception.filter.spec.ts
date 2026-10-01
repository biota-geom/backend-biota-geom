import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { AUTH_MESSAGES } from '../../../auth/presentation/messages/auth.messages.pt-br';
import { CustomerNotFoundError } from '../../../customers/domain/errors/customer-not-found.error';
import { ConditionCategoryNotFoundError } from '../../domain/errors/condition-category-not-found.error';
import { ConditionCategoryNotLinkedError } from '../../domain/errors/condition-category-not-linked.error';
import { InvalidLicenseDateRangeError } from '../../domain/errors/invalid-license-date-range.error';
import { IssuingAgencyNotFoundError } from '../../domain/errors/issuing-agency-not-found.error';
import { LicenseConditionLicenseMismatchError } from '../../domain/errors/license-condition-license-mismatch.error';
import { LicenseNotFoundError } from '../../domain/errors/license-not-found.error';
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

  it('maps IssuingAgencyNotFoundError to 422', () => {
    const { host, status, json } = buildHost();

    filter.catch(new IssuingAgencyNotFoundError('agency-1'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: LICENSES_MESSAGES.ISSUING_AGENCY_NOT_FOUND,
      }),
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

  it('maps ConditionCategoryNotFoundError to 404 without revealing the parameter', () => {
    const { host, status, json } = buildHost();

    filter.catch(new ConditionCategoryNotFoundError('metric-1'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: LICENSES_MESSAGES.CONDITION_CATEGORY_NOT_FOUND,
      }),
    );
  });

  it('maps ConditionCategoryNotLinkedError to 422', () => {
    const { host, status, json } = buildHost();

    filter.catch(new ConditionCategoryNotLinkedError('metric-1'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(json).toHaveBeenCalledWith({
      statusCode: 422,
      message: 'O parâmetro GRI informado não está vinculado a esta empresa.',
      error: 'Unprocessable Entity',
    });
  });
});
