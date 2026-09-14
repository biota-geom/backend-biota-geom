import { User } from '../../users/domain/user.entity';
import { UserAlreadyExistsError } from '../../users/domain/user-already-exists.error';
import { UserRepository } from '../../users/domain/user.repository';
import { InMemoryUserRepository } from '../../users/infra/in-memory-user.repository';
import { RegistrationNotAllowedError } from '../domain/errors/registration-not-allowed.error';
import { AuthConfigService } from '../infra/auth-config.service';
import { FakePasswordHasher, FakeTokenService } from './__tests__/fakes';
import { AuthEventLogger } from './auth-event.logger';
import { RegisterUserUseCase } from './register-user.use-case';

function buildUseCase() {
  const userRepository = new InMemoryUserRepository();
  const passwordHasher = new FakePasswordHasher();
  const tokenService = new FakeTokenService();
  const authConfig = {
    allowedEmailDomain: 'biotageom.com.br',
  } as unknown as AuthConfigService;
  const eventLogger = {
    success: jest.fn(),
    failure: jest.fn(),
  } as unknown as AuthEventLogger;

  const useCase = new RegisterUserUseCase(
    userRepository,
    passwordHasher,
    tokenService,
    authConfig,
    eventLogger,
  );

  return { useCase, userRepository, passwordHasher, tokenService, eventLogger };
}

const VALID_INPUT = {
  name: 'John Doe',
  email: 'john.doe@biotageom.com.br',
  password: 'Sup3r$ecret!',
};

// Never finds an existing user (so the use case's pre-check passes) but lets
// `create` throw an arbitrary error, to simulate the check-then-act race
// between findByEmail and the unique constraint at insert time.
class RaceyUserRepository implements UserRepository {
  constructor(private readonly createError: Error) {}

  findByEmail(): Promise<User | null> {
    return Promise.resolve(null);
  }

  findById(): Promise<User | null> {
    return Promise.resolve(null);
  }

  create(): Promise<User> {
    return Promise.reject(this.createError);
  }

  touchLastLogin(): Promise<void> {
    return Promise.resolve();
  }
}

describe('RegisterUserUseCase', () => {
  it('creates a user with isActive=true, isAdmin=false and issues both tokens', async () => {
    const { useCase, userRepository } = buildUseCase();

    const result = await useCase.execute(VALID_INPUT);

    expect(result.user.isActive).toBe(true);
    expect(result.user.isAdmin).toBe(false);
    expect(result.user.passwordHash).toBe(`hashed:${VALID_INPUT.password}`);
    expect(result.accessToken).toBe(`access:${result.user.id}`);
    expect(result.refreshToken).toBe(`refresh:${result.user.id}`);

    const persisted = await userRepository.findByEmail(VALID_INPUT.email);
    expect(persisted).not.toBeNull();
    expect(persisted?.passwordHash).not.toBe(VALID_INPUT.password);
  });

  it('rejects a disallowed email domain without hashing the password or touching the repository', async () => {
    const { useCase, passwordHasher, userRepository } = buildUseCase();
    const hashSpy = jest.spyOn(passwordHasher, 'hash');

    await expect(
      useCase.execute({ ...VALID_INPUT, email: 'john@gmail.com' }),
    ).rejects.toThrow(RegistrationNotAllowedError);

    expect(hashSpy).not.toHaveBeenCalled();
    expect(await userRepository.findByEmail('john@gmail.com')).toBeNull();
  });

  it('rejects a duplicate email with the same error as a disallowed domain', async () => {
    const { useCase } = buildUseCase();

    await useCase.execute(VALID_INPUT);

    let disallowedDomainError: unknown;
    let duplicateEmailError: unknown;

    try {
      await useCase.execute({ ...VALID_INPUT, email: 'john@gmail.com' });
    } catch (error) {
      disallowedDomainError = error;
    }

    try {
      await useCase.execute(VALID_INPUT);
    } catch (error) {
      duplicateEmailError = error;
    }

    /*
     * Both map to the exact same HTTP response via AuthExceptionFilter
     * (see auth-exception.filter.spec.ts) — `reason` differs only for logs.
     */
    expect(disallowedDomainError).toBeInstanceOf(RegistrationNotAllowedError);
    expect(duplicateEmailError).toBeInstanceOf(RegistrationNotAllowedError);
    expect((disallowedDomainError as RegistrationNotAllowedError).reason).toBe(
      'domain_not_allowed',
    );
    expect((duplicateEmailError as RegistrationNotAllowedError).reason).toBe(
      'email_already_registered',
    );
  });

  it('translates a race-condition UserAlreadyExistsError from create() into RegistrationNotAllowedError', async () => {
    const passwordHasher = new FakePasswordHasher();
    const tokenService = new FakeTokenService();
    const authConfig = {
      allowedEmailDomain: 'biotageom.com.br',
    } as unknown as AuthConfigService;
    const eventLogger = {
      success: jest.fn(),
      failure: jest.fn(),
    } as unknown as AuthEventLogger;
    const userRepository = new RaceyUserRepository(
      new UserAlreadyExistsError(VALID_INPUT.email),
    );
    const useCase = new RegisterUserUseCase(
      userRepository,
      passwordHasher,
      tokenService,
      authConfig,
      eventLogger,
    );

    const error = await useCase.execute(VALID_INPUT).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(RegistrationNotAllowedError);
    expect((error as RegistrationNotAllowedError).reason).toBe(
      'email_already_registered',
    );
  });

  it('propagates an unexpected repository error unchanged', async () => {
    const passwordHasher = new FakePasswordHasher();
    const tokenService = new FakeTokenService();
    const authConfig = {
      allowedEmailDomain: 'biotageom.com.br',
    } as unknown as AuthConfigService;
    const eventLogger = {
      success: jest.fn(),
      failure: jest.fn(),
    } as unknown as AuthEventLogger;
    const unexpectedError = new Error('database is on fire');
    const userRepository = new RaceyUserRepository(unexpectedError);
    const useCase = new RegisterUserUseCase(
      userRepository,
      passwordHasher,
      tokenService,
      authConfig,
      eventLogger,
    );

    await expect(useCase.execute(VALID_INPUT)).rejects.toBe(unexpectedError);
  });
});
