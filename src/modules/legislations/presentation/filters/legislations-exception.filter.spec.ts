import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { LicenseLegislationNotFoundError } from '../../domain/errors/license-legislation-not-found.error';
import { LEGISLATIONS_MESSAGES } from '../messages/legislations.messages.pt-br';
import { LegislationsExceptionFilter } from './legislations-exception.filter';

function buildHost(): {
  host: ArgumentsHost;
  status: jest.Mock;
  json: jest.Mock;
} {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status, json }) }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('LegislationsExceptionFilter', () => {
  const filter = new LegislationsExceptionFilter();

  it('maps LicenseLegislationNotFoundError to 404', () => {
    const { host, status, json } = buildHost();

    filter.catch(new LicenseLegislationNotFoundError('leg-1'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: LEGISLATIONS_MESSAGES.LEGISLATION_NOT_FOUND,
      }),
    );
  });
});
