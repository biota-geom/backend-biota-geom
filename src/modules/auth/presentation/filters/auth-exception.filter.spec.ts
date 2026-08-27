import { ArgumentsHost } from '@nestjs/common';
import { AuthDomainError } from '../../domain/errors/auth-domain.error';
import { InactiveAccountError } from '../../domain/errors/inactive-account.error';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import { InvalidRefreshTokenError } from '../../domain/errors/invalid-refresh-token.error';
import { RegistrationNotAllowedError } from '../../domain/errors/registration-not-allowed.error';
import { AUTH_MESSAGES } from '../messages/auth.messages.pt-br';
import { AuthExceptionFilter } from './auth-exception.filter';

function buildHost() {
  const json = jest.fn<void, [unknown]>();
  const status = jest
    .fn<{ json: typeof json }, [number]>()
    .mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('AuthExceptionFilter', () => {
  const filter = new AuthExceptionFilter();

  it.each([
    [new InvalidCredentialsError(), 401, AUTH_MESSAGES.INVALID_CREDENTIALS],
    [new InactiveAccountError(), 401, AUTH_MESSAGES.INVALID_CREDENTIALS],
    [
      new RegistrationNotAllowedError('domain_not_allowed'),
      403,
      AUTH_MESSAGES.REGISTRATION_NOT_ALLOWED,
    ],
    [
      new RegistrationNotAllowedError('email_already_registered'),
      403,
      AUTH_MESSAGES.REGISTRATION_NOT_ALLOWED,
    ],
    [new InvalidRefreshTokenError(), 401, AUTH_MESSAGES.SESSION_EXPIRED],
  ] as [AuthDomainError, number, string][])(
    'maps %p to status %i with the exact PT-BR message',
    (error, expectedStatus, expectedMessage) => {
      const { host, status, json } = buildHost();

      filter.catch(error, host);

      expect(status).toHaveBeenCalledWith(expectedStatus);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expectedMessage }),
      );
    },
  );

  it('gives InvalidCredentialsError and InactiveAccountError an identical response', () => {
    const first = buildHost();
    const second = buildHost();

    filter.catch(new InvalidCredentialsError(), first.host);
    filter.catch(new InactiveAccountError(), second.host);

    const secondStatusCode = second.status.mock.calls[0]?.[0];
    expect(first.status).toHaveBeenCalledWith(secondStatusCode);
    expect(first.json.mock.calls[0]).toEqual(second.json.mock.calls[0]);
  });

  it('gives domain-not-allowed and duplicate-email an identical response', () => {
    const first = buildHost();
    const second = buildHost();

    filter.catch(
      new RegistrationNotAllowedError('domain_not_allowed'),
      first.host,
    );
    filter.catch(
      new RegistrationNotAllowedError('email_already_registered'),
      second.host,
    );

    expect(first.json.mock.calls[0]).toEqual(second.json.mock.calls[0]);
  });
});
