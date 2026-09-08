import { User } from '../../../users/domain/user.entity';
import { toUserResponse } from './user-response.dto';

const BASE_USER: User = {
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

describe('toUserResponse', () => {
  it('maps the domain user to the wire shape without leaking passwordHash', () => {
    const result = toUserResponse(BASE_USER);

    expect(result).toEqual({
      id: 'user-1',
      name: 'John Doe',
      email: 'john.doe@biotageom.com.br',
      is_active: true,
      is_admin: false,
      created_at: '2026-01-01T00:00:00.000Z',
      last_login_at: null,
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('serializes a non-null lastLoginAt to an ISO string', () => {
    const result = toUserResponse({
      ...BASE_USER,
      lastLoginAt: new Date('2026-02-01T12:00:00.000Z'),
    });

    expect(result.last_login_at).toBe('2026-02-01T12:00:00.000Z');
  });
});
