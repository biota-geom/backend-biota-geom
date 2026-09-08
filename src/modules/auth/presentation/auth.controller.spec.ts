import { User } from '../../users/domain/user.entity';
import { GetCurrentUserUseCase } from '../application/get-current-user.use-case';
import { LoginUserUseCase } from '../application/login-user.use-case';
import { RefreshAccessTokenUseCase } from '../application/refresh-access-token.use-case';
import { RegisterUserUseCase } from '../application/register-user.use-case';
import { AuthController } from './auth.controller';

const USER: User = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john.doe@biotageom.com.br',
  passwordHash: 'hashed',
  isActive: true,
  isAdmin: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  lastLoginAt: null,
};

function buildController() {
  const registerExecute = jest.fn();
  const loginExecute = jest.fn();
  const refreshExecute = jest.fn();
  const getCurrentUserExecute = jest.fn();

  const controller = new AuthController(
    { execute: registerExecute } as unknown as RegisterUserUseCase,
    { execute: loginExecute } as unknown as LoginUserUseCase,
    { execute: refreshExecute } as unknown as RefreshAccessTokenUseCase,
    { execute: getCurrentUserExecute } as unknown as GetCurrentUserUseCase,
  );

  return {
    controller,
    registerExecute,
    loginExecute,
    refreshExecute,
    getCurrentUserExecute,
  };
}

describe('AuthController', () => {
  it('register() delegates to RegisterUserUseCase and maps the session', async () => {
    const { controller, registerExecute } = buildController();
    registerExecute.mockResolvedValue({
      user: USER,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresInSeconds: 900,
    });

    const result = await controller.register({
      name: 'John Doe',
      email: 'john.doe@biotageom.com.br',
      password: 'Sup3r$ecret!',
    });

    expect(registerExecute).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john.doe@biotageom.com.br',
      password: 'Sup3r$ecret!',
    });
    expect(result).toMatchObject({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
  });

  it('login() delegates to LoginUserUseCase and maps the session', async () => {
    const { controller, loginExecute } = buildController();
    loginExecute.mockResolvedValue({
      user: USER,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresInSeconds: 900,
    });

    const result = await controller.login({
      email: 'john.doe@biotageom.com.br',
      password: 'Sup3r$ecret!',
    });

    expect(loginExecute).toHaveBeenCalledWith({
      email: 'john.doe@biotageom.com.br',
      password: 'Sup3r$ecret!',
    });
    expect(result).toMatchObject({ access_token: 'access-token' });
  });

  it('refresh() delegates to RefreshAccessTokenUseCase and maps the session', async () => {
    const { controller, refreshExecute } = buildController();
    refreshExecute.mockResolvedValue({
      user: USER,
      accessToken: 'new-access-token',
      expiresInSeconds: 900,
    });

    const result = await controller.refresh({ refreshToken: 'refresh-token' });

    expect(refreshExecute).toHaveBeenCalledWith({
      refreshToken: 'refresh-token',
    });
    expect(result).toMatchObject({ access_token: 'new-access-token' });
    expect(result).not.toHaveProperty('refresh_token');
  });

  it('me() delegates to GetCurrentUserUseCase using the id attached by the guard', async () => {
    const { controller, getCurrentUserExecute } = buildController();
    getCurrentUserExecute.mockResolvedValue(USER);

    const result = await controller.me({ id: 'user-1' });

    expect(getCurrentUserExecute).toHaveBeenCalledWith('user-1');
    expect(result).toMatchObject({ id: 'user-1', email: USER.email });
  });
});
