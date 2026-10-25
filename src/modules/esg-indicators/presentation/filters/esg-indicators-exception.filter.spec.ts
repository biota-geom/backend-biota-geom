import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { AUTH_MESSAGES } from '../../../auth/presentation/messages/auth.messages.pt-br';
import { CustomerNotFoundError } from '../../../customers/domain/errors/customer-not-found.error';
import { InvalidReferenceMonthError } from '../../domain/errors/invalid-reference-month.error';
import { ESG_INDICATORS_MESSAGES } from '../messages/esg-indicators.messages.pt-br';
import { EsgIndicatorsExceptionFilter } from './esg-indicators-exception.filter';

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

describe('EsgIndicatorsExceptionFilter', () => {
  const filter = new EsgIndicatorsExceptionFilter();

  it('maps CustomerNotFoundError to 404', () => {
    const { host, status, json } = buildHost();

    filter.catch(new CustomerNotFoundError('customer-1'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: AUTH_MESSAGES.CUSTOMER_NOT_FOUND }),
    );
  });

  it('maps InvalidReferenceMonthError to 400', () => {
    const { host, status, json } = buildHost();

    filter.catch(new InvalidReferenceMonthError('2026-13'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: ESG_INDICATORS_MESSAGES.INVALID_MONTH,
      }),
    );
  });
});
