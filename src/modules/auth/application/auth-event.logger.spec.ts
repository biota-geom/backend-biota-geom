import { Logger } from '@nestjs/common';
import { AuthEventLogger } from './auth-event.logger';

describe('AuthEventLogger', () => {
  it('logs a success event with all details', () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const logger = new AuthEventLogger();

    logger.success('auth.login.success', {
      userId: 'user-1',
      reason: 'ok',
      email: 'john.doe@biotageom.com.br',
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'auth.login.success',
        outcome: 'success',
        userId: 'user-1',
        reason: 'ok',
      }),
    );
    const loggedPayload = logSpy.mock.calls[0]?.[0] as { emailHash: string };
    expect(typeof loggedPayload.emailHash).toBe('string');
    logSpy.mockRestore();
  });

  it('logs a success event with no details, defaulting fields to null', () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const logger = new AuthEventLogger();

    logger.success('auth.register.success');

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: null,
        userId: null,
        emailHash: null,
      }),
    );
    logSpy.mockRestore();
  });

  it('logs a failure event as a warning', () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const logger = new AuthEventLogger();

    logger.failure('auth.login.failure', { reason: 'invalid_password' });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'auth.login.failure',
        outcome: 'failure',
        reason: 'invalid_password',
      }),
    );
    warnSpy.mockRestore();
  });

  it('hashes the same email deterministically without exposing the raw value', () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const logger = new AuthEventLogger();

    logger.success('auth.login.success', {
      email: 'John.Doe@Biotageom.com.br',
    });
    logger.success('auth.login.success', {
      email: 'john.doe@biotageom.com.br',
    });

    const [firstCall, secondCall] = logSpy.mock.calls as [
      { emailHash: string },
    ][];
    expect(firstCall[0].emailHash).toBe(secondCall[0].emailHash);
    expect(firstCall[0].emailHash).not.toContain('@');
    logSpy.mockRestore();
  });
});
