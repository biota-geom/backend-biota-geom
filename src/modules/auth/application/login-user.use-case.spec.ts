import { InMemoryUserRepository } from '../../users/infra/in-memory-user.repository';
import { InactiveAccountError } from '../domain/errors/inactive-account.error';
import { InvalidCredentialsError } from '../domain/errors/invalid-credentials.error';
import { FakePasswordHasher, FakeTokenService } from './__tests__/fakes';
import { AuthEventLogger } from './auth-event.logger';
import { LoginUserUseCase } from './login-user.use-case';

function buildUseCase() {
  const userRepository = new InMemoryUserRepository();
  const passwordHasher = new FakePasswordHasher();
  const tokenService = new FakeTokenService();
  const eventLogger = {
    success: jest.fn(),
    failure: jest.fn(),
  } as unknown as AuthEventLogger;

  const useCase = new LoginUserUseCase(
    userRepository,
    passwordHasher,
    tokenService,
    eventLogger,
  );

  return { useCase, userRepository, passwordHasher, tokenService };
}

const PASSWORD = 'Sup3r$ecret!';

async function createUser(
  userRepository: InMemoryUserRepository,
  overrides: { isActive?: boolean } = {},
) {
  const user = await userRepository.create({
    name: 'Lucas Arieta',
    email: 'lucas.arieta@biotageom.com.br',
    passwordHash: `hashed:${PASSWORD}`,
  });

  if (overrides.isActive === false) {
    // InMemoryUserRepository stores the object by reference, so mutating the
    // returned user also mutates what findByEmail/findById will return.
    user.isActive = false;
  }

  return user;
}

describe('LoginUserUseCase', () => {
  it('logs in with correct credentials and updates lastLoginAt', async () => {
    const { useCase, userRepository } = buildUseCase();
    const user = await createUser(userRepository);
    expect(user.lastLoginAt).toBeNull();

    const result = await useCase.execute({
      email: user.email,
      password: PASSWORD,
    });

    expect(result.accessToken).toBe(`access:${user.id}`);
    expect(result.refreshToken).toBe(`refresh:${user.id}`);
    expect(result.user.lastLoginAt).not.toBeNull();

    const persisted = await userRepository.findById(user.id);
    expect(persisted?.lastLoginAt).not.toBeNull();
  });

  it('rejects an unknown email but still runs a dummy password verification', async () => {
    const { useCase, passwordHasher } = buildUseCase();

    await expect(
      useCase.execute({
        email: 'nobody@biotageom.com.br',
        password: 'whatever',
      }),
    ).rejects.toThrow(InvalidCredentialsError);

    // Timing-equalization: verify() must run even for an unknown email.
    expect(passwordHasher.verifyCallCount).toBe(1);
  });

  it('rejects an incorrect password', async () => {
    const { useCase, userRepository } = buildUseCase();
    const user = await createUser(userRepository);

    await expect(
      useCase.execute({ email: user.email, password: 'wrong-password' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('rejects an inactive account with InactiveAccountError, not InvalidCredentialsError', async () => {
    const { useCase, userRepository } = buildUseCase();
    const user = await createUser(userRepository, { isActive: false });

    await expect(
      useCase.execute({ email: user.email, password: PASSWORD }),
    ).rejects.toThrow(InactiveAccountError);
  });
});
