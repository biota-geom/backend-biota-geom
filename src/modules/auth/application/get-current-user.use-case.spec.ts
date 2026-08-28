import { InMemoryUserRepository } from '../../users/infra/in-memory-user.repository';
import { InvalidRefreshTokenError } from '../domain/errors/invalid-refresh-token.error';
import { GetCurrentUserUseCase } from './get-current-user.use-case';

describe('GetCurrentUserUseCase', () => {
  it('returns the user when found and active', async () => {
    const userRepository = new InMemoryUserRepository();
    const user = await userRepository.create({
      name: 'John Doe',
      email: 'john.doe@biotageom.com.br',
      passwordHash: 'hashed:whatever',
    });
    const useCase = new GetCurrentUserUseCase(userRepository);

    await expect(useCase.execute(user.id)).resolves.toEqual(user);
  });

  it('rejects when the user does not exist', async () => {
    const userRepository = new InMemoryUserRepository();
    const useCase = new GetCurrentUserUseCase(userRepository);

    await expect(useCase.execute('missing-id')).rejects.toThrow(
      InvalidRefreshTokenError,
    );
  });

  it('rejects when the user is inactive', async () => {
    const userRepository = new InMemoryUserRepository();
    const user = await userRepository.create({
      name: 'John Doe',
      email: 'john.doe@biotageom.com.br',
      passwordHash: 'hashed:whatever',
    });
    user.isActive = false;
    const useCase = new GetCurrentUserUseCase(userRepository);

    await expect(useCase.execute(user.id)).rejects.toThrow(
      InvalidRefreshTokenError,
    );
  });
});
