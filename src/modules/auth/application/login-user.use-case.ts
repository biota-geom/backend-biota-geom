import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../users/domain/user.repository';
import { InactiveAccountError } from '../domain/errors/inactive-account.error';
import { InvalidCredentialsError } from '../domain/errors/invalid-credentials.error';
import { PasswordHasher } from '../domain/password-hasher';
import { TokenService } from '../domain/token-service';
import { DUMMY_PASSWORD_HASH } from '../infra/argon2-password-hasher';
import { AuthEventLogger } from './auth-event.logger';
import { AuthSessionResult } from './auth-session.result';

export interface LoginUserInput {
  email: string;
  password: string;
}

@Injectable()
export class LoginUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly eventLogger: AuthEventLogger,
  ) {}

  async execute(input: LoginUserInput): Promise<AuthSessionResult> {
    const user = await this.userRepository.findByEmail(input.email);

    if (!user) {
      // Run a real Argon2 verification against a dummy hash so a request for
      // an unknown email takes the same time as one for a known email with a
      // wrong password — otherwise response latency alone reveals which
      // emails are registered.
      await this.passwordHasher.verify(DUMMY_PASSWORD_HASH, input.password);
      this.eventLogger.failure('auth.login.failure', {
        reason: 'unknown_email',
        email: input.email,
      });
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.passwordHasher.verify(
      user.passwordHash,
      input.password,
    );

    if (!passwordMatches) {
      this.eventLogger.failure('auth.login.failure', {
        reason: 'invalid_password',
        userId: user.id,
      });
      throw new InvalidCredentialsError();
    }

    if (!user.isActive) {
      this.eventLogger.failure('auth.login.failure', {
        reason: 'inactive_account',
        userId: user.id,
      });
      throw new InactiveAccountError();
    }

    const now = new Date();
    await this.userRepository.touchLastLogin(user.id, now);

    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.issueAccessToken(user.id),
      this.tokenService.issueRefreshToken(user.id),
    ]);

    this.eventLogger.success('auth.login.success', { userId: user.id });

    return {
      user: { ...user, lastLoginAt: now },
      accessToken,
      refreshToken,
      expiresInSeconds: this.tokenService.getAccessTokenTtlSeconds(),
    };
  }
}
