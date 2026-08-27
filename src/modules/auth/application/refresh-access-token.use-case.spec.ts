import { InMemoryUserRepository } from '../../users/infra/in-memory-user.repository';
import { InvalidRefreshTokenError } from '../domain/errors/invalid-refresh-token.error';
import { FakeTokenService } from './__tests__/fakes';
import { AuthEventLogger } from './auth-event.logger';
import { RefreshAccessTokenUseCase } from './refresh-access-token.use-case';

function buildUseCase() {
  const userRepository = new InMemoryUserRepository();
  const tokenService = new FakeTokenService();
  const eventLogger = {
    success: jest.fn(),
    failure: jest.fn(),
  } as unknown as AuthEventLogger;

  const useCase = new RefreshAccessTokenUseCase(
    userRepository,
    tokenService,
    eventLogger,
  );

  return { useCase, userRepository, tokenService };
}

describe('RefreshAccessTokenUseCase', () => {
  it('issues a new access token and does NOT return a new refresh token', async () => {
    const { useCase, userRepository, tokenService } = buildUseCase();
    const user = await userRepository.create({
      name: 'John Doe',
      email: 'john.doe@biotageom.com.br',
      passwordHash: 'hashed:whatever',
    });
    const refreshToken = await tokenService.issueRefreshToken(user.id);

    const result = await useCase.execute({ refreshToken });

    expect(result.accessToken).toBe(`access:${user.id}`);
    expect(result).not.toHaveProperty('refreshToken');
  });

  it('rejects an invalid or expired refresh token', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute({ refreshToken: 'garbage' })).rejects.toThrow(
      InvalidRefreshTokenError,
    );
  });

  it('rejects an access token presented as a refresh token', async () => {
    const { useCase, tokenService } = buildUseCase();
    const accessToken = await tokenService.issueAccessToken('some-user-id');

    await expect(
      useCase.execute({ refreshToken: accessToken }),
    ).rejects.toThrow(InvalidRefreshTokenError);
  });

  it('rejects a refresh token for a user that no longer exists', async () => {
    const { useCase, tokenService } = buildUseCase();
    const refreshToken =
      await tokenService.issueRefreshToken('deleted-user-id');

    await expect(useCase.execute({ refreshToken })).rejects.toThrow(
      InvalidRefreshTokenError,
    );
  });

  it('rejects a refresh token for a deactivated user', async () => {
    const { useCase, userRepository, tokenService } = buildUseCase();
    const user = await userRepository.create({
      name: 'John Doe',
      email: 'john.doe@biotageom.com.br',
      passwordHash: 'hashed:whatever',
    });
    user.isActive = false;
    const refreshToken = await tokenService.issueRefreshToken(user.id);

    await expect(useCase.execute({ refreshToken })).rejects.toThrow(
      InvalidRefreshTokenError,
    );
  });
});
