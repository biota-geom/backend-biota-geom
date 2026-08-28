import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '../types/authenticated-request';

// Exported separately (rather than inlined into createParamDecorator) so it
// can be unit tested directly — Nest only invokes the factory it wraps
// during real request handling, never from a plain function call.
export function getCurrentUser(
  _data: unknown,
  ctx: ExecutionContext,
): { id: string } {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.user;
}

export const CurrentUser = createParamDecorator(getCurrentUser);
