import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { AUTH_MESSAGES } from '../../../auth/presentation/messages/auth.messages.pt-br';
import { CustomerAlreadyExistsError } from '../../domain/errors/customer-already-exists.error';
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
  it('answers a duplicate document with 409 and the PT-BR message', () => {
    const { host, status, json } = buildHost();

    new CustomersExceptionFilter().catch(
      new CustomerAlreadyExistsError('12345678000199'),
      host,
    );

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

    new CustomersExceptionFilter().catch(
      new SectorNotFoundError('missing'),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: AUTH_MESSAGES.SECTOR_NOT_FOUND,
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    );
  });
});
