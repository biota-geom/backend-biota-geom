import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../users/domain/user.repository';
import { InvalidRefreshTokenError } from '../domain/errors/invalid-refresh-token.error';
import { TokenService } from '../domain/token-service';
import { AuthEventLogger } from './auth-event.logger';
import { RefreshedSessionResult } from './auth-session.result';

export interface RefreshAccessTokenInput {
  refreshToken: string;
}

@Injectable()
export class RefreshAccessTokenUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
    private readonly eventLogger: AuthEventLogger,
  ) {}

  async execute(
    input: RefreshAccessTokenInput,
  ): Promise<RefreshedSessionResult> {
    const payload = await this.verifyToken(input.refreshToken);

    const user = await this.userRepository.findById(payload.sub);

    if (!user) {
      this.eventLogger.failure('auth.refresh.failure', {
        reason: 'user_not_found',
      });
      throw new InvalidRefreshTokenError();
    }

    if (!user.isActive) {
      // The only revocation lever in a stateless-JWT design: deactivating a
      // user takes effect the next time they refresh, bounded by the access
      // token's own TTL.
      this.eventLogger.failure('auth.refresh.failure', {
        reason: 'inactive_account',
        userId: user.id,
      });
      throw new InvalidRefreshTokenError();
    }

    const accessToken = await this.tokenService.issueAccessToken(user.id);

    this.eventLogger.success('auth.refresh.success', { userId: user.id });

    return {
      user,
      accessToken,
      expiresInSeconds: this.tokenService.getAccessTokenTtlSeconds(),
    };
  }

  private async verifyToken(refreshToken: string) {
    try {
      return await this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      this.eventLogger.failure('auth.refresh.failure', {
        reason: 'invalid_token',
      });
      throw new InvalidRefreshTokenError();
    }
  }
}
