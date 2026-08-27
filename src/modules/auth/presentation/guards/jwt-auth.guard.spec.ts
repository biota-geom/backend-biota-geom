import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { FakeTokenService } from '../../application/__tests__/fakes';
import { AUTH_MESSAGES } from '../messages/auth.messages.pt-br';
import { JwtAuthGuard } from './jwt-auth.guard';

function buildContext(headers: Record<string, string | undefined>) {
  const request: {
    headers: Record<string, string | undefined>;
    user?: { id: string };
  } = {
    headers,
  };

  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;

  return { context, request };
}

describe('JwtAuthGuard', () => {
  it('allows a request with a valid Bearer access token and attaches the user', async () => {
    const tokenService = new FakeTokenService();
    const guard = new JwtAuthGuard(tokenService);
    const token = await tokenService.issueAccessToken('user-1');
    const { context, request } = buildContext({
      authorization: `Bearer ${token}`,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'user-1' });
  });

  it('rejects a missing Authorization header', async () => {
    const guard = new JwtAuthGuard(new FakeTokenService());
    const { context } = buildContext({});

    await expect(guard.canActivate(context)).rejects.toMatchObject(
      new UnauthorizedException(AUTH_MESSAGES.SESSION_EXPIRED),
    );
  });

  it('rejects a header without the Bearer scheme', async () => {
    const guard = new JwtAuthGuard(new FakeTokenService());
    const { context } = buildContext({ authorization: 'Basic abc123' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an expired or malformed token', async () => {
    const guard = new JwtAuthGuard(new FakeTokenService());
    const { context } = buildContext({ authorization: 'Bearer garbage' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a refresh token presented as an access token', async () => {
    const tokenService = new FakeTokenService();
    const guard = new JwtAuthGuard(tokenService);
    const refreshToken = await tokenService.issueRefreshToken('user-1');
    const { context } = buildContext({
      authorization: `Bearer ${refreshToken}`,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
