import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { describe, it, expect, jest } from '@jest/globals';
import { AUTH_MESSAGES } from '../../../auth/presentation/messages/auth.messages.pt-br';
import { CustomerAddressNotFoundError } from '../../domain/errors/customer-address-not-found.error';
import { CustomerAlreadyExistsError } from '../../domain/errors/customer-already-exists.error';
import { CustomerNotFoundError } from '../../domain/errors/customer-not-found.error';
import { InvalidEsgIndicatorIdsError } from '../../domain/errors/invalid-esg-indicator-ids.error';
import { SectorNotFoundError } from '../../domain/errors/sector-not-found.error';
import { CustomersExceptionFilter } from './customers-exception.filter';

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

describe('CustomersExceptionFilter', () => {
  const filter = new CustomersExceptionFilter();

  it('maps CustomerNotFoundError to 404', () => {
    const { host, status, json } = buildHost();

    filter.catch(new CustomerNotFoundError('customer-1'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: AUTH_MESSAGES.CUSTOMER_NOT_FOUND }),
    );
  });

  it('maps CustomerAddressNotFoundError to 400', () => {
    const { host, status, json } = buildHost();

    filter.catch(new CustomerAddressNotFoundError('customer-1'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: AUTH_MESSAGES.CUSTOMER_ADDRESS_NOT_FOUND,
      }),
    );
  });

  it('maps InvalidEsgIndicatorIdsError to 400', () => {
    const { host, status, json } = buildHost();

    filter.catch(new InvalidEsgIndicatorIdsError(['missing-id']), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: AUTH_MESSAGES.INVALID_ESG_INDICATOR_IDS,
      }),
    );
  });

  it('answers a duplicate document with 409 and the PT-BR message', () => {
    const { host, status, json } = buildHost();

    filter.catch(new CustomerAlreadyExistsError('12345678000199'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: AUTH_MESSAGES.CUSTOMER_DOCUMENT_ALREADY_EXISTS,
        statusCode: HttpStatus.CONFLICT,
      }),
    );
  });

  it('answers an unknown sector with 422 and the PT-BR message', () => {
    const { host, status, json } = buildHost();

    filter.catch(new SectorNotFoundError('missing'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: AUTH_MESSAGES.SECTOR_NOT_FOUND,
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    );
  });
});
