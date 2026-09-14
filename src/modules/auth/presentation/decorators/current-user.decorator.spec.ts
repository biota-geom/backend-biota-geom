import { ExecutionContext } from '@nestjs/common';
import { CurrentUser, getCurrentUser } from './current-user.decorator';

describe('getCurrentUser', () => {
  it('reads the user attached to the request by JwtAuthGuard', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'user-1' } }),
      }),
    } as unknown as ExecutionContext;

    expect(getCurrentUser(undefined, context)).toEqual({ id: 'user-1' });
  });
});

describe('CurrentUser', () => {
  it('is a working param decorator', () => {
    expect(CurrentUser).toBeDefined();
  });
});
