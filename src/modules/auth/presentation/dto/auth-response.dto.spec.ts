import { User } from '../../../users/domain/user.entity';
import {
  AuthSessionResult,
  RefreshedSessionResult,
} from '../../application/auth-session.result';
import { toAuthResponse, toRefreshResponse } from './auth-response.dto';

const USER: User = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john.doe@biotageom.com.br',
  passwordHash: 'super-secret-hash',
  isActive: true,
  isAdmin: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  lastLoginAt: null,
};

describe('toAuthResponse', () => {
  it('maps a full session into the register/login wire response', () => {
    const session: AuthSessionResult = {
      user: USER,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresInSeconds: 900,
    };

    const result = toAuthResponse(session);

    expect(result).toMatchObject({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      token_type: 'Bearer',
      expires_in: 900,
    });
    expect(result.user.id).toBe('user-1');
  });
});

describe('toRefreshResponse', () => {
  it('maps a refreshed session into the refresh wire response, with no refresh_token field', () => {
    const session: RefreshedSessionResult = {
      user: USER,
      accessToken: 'new-access-token',
      expiresInSeconds: 900,
    };

    const result = toRefreshResponse(session);

    expect(result).toMatchObject({
      access_token: 'new-access-token',
      token_type: 'Bearer',
      expires_in: 900,
    });
    expect(result.user.id).toBe('user-1');
    expect(result).not.toHaveProperty('refresh_token');
  });
});
