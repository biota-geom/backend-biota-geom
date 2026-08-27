import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from '../../domain/token-service';
import { AUTH_MESSAGES } from '../messages/auth.messages.pt-br';
import { AuthenticatedRequest } from '../types/authenticated-request';

const BEARER_PREFIX = 'Bearer ';

// Deliberately does not query the database — the whole point of a stateless
// JWT is that authenticating a request costs zero I/O. Consumers that need
// the full user record call GetCurrentUserUseCase explicitly.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException(AUTH_MESSAGES.SESSION_EXPIRED);
    }

    try {
      const payload = await this.tokenService.verifyAccessToken(token);
      request.user = { id: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException(AUTH_MESSAGES.SESSION_EXPIRED);
    }
  }

  private extractToken(header: string | undefined): string | null {
    if (!header || !header.startsWith(BEARER_PREFIX)) {
      return null;
    }

    return header.slice(BEARER_PREFIX.length).trim() || null;
  }
}
