import { Injectable } from '@nestjs/common';
import { UserAlreadyExistsError } from '../../users/domain/user-already-exists.error';
import { UserRepository } from '../../users/domain/user.repository';
import { isEmailDomainAllowed } from '../domain/email-domain-policy';
import { RegistrationNotAllowedError } from '../domain/errors/registration-not-allowed.error';
import { PasswordHasher } from '../domain/password-hasher';
import { TokenService } from '../domain/token-service';
import { AuthConfigService } from '../infra/auth-config.service';
import { AuthEventLogger } from './auth-event.logger';
import { AuthSessionResult } from './auth-session.result';

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
}

@Injectable()
export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly authConfig: AuthConfigService,
    private readonly eventLogger: AuthEventLogger,
  ) {}

  async execute(input: RegisterUserInput): Promise<AuthSessionResult> {
    /*
     * findByEmail runs unconditionally, before the (instant, no-I/O) domain
     * check below — otherwise a disallowed-domain request would return its
     * identical 403 measurably faster than a duplicate-email request, and
     * response timing alone would leak which of the two occurred, defeating
     * the point of collapsing them into one indistinguishable error.
     */
    const existing = await this.userRepository.findByEmail(input.email);

    if (
      !isEmailDomainAllowed(input.email, this.authConfig.allowedEmailDomain)
    ) {
      this.eventLogger.failure('auth.register.denied', {
        reason: 'domain_not_allowed',
        email: input.email,
      });
      throw new RegistrationNotAllowedError('domain_not_allowed');
    }

    if (existing) {
      this.eventLogger.failure('auth.register.denied', {
        reason: 'email_already_registered',
        email: input.email,
      });
      throw new RegistrationNotAllowedError('email_already_registered');
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    const user = await this.createUser(input, passwordHash);

    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.issueAccessToken(user.id),
      this.tokenService.issueRefreshToken(user.id),
    ]);

    this.eventLogger.success('auth.register.success', { userId: user.id });

    return {
      user,
      accessToken,
      refreshToken,
      expiresInSeconds: this.tokenService.getAccessTokenTtlSeconds(),
    };
  }

  private async createUser(input: RegisterUserInput, passwordHash: string) {
    try {
      return await this.userRepository.create({
        name: input.name,
        email: input.email,
        passwordHash,
      });
    } catch (error) {
      /*
       * Closes the check-then-act race between findByEmail and create: the
       * unique constraint is the real guarantee, this read was only an
       * optimization to avoid hashing a password we were always going to reject.
       */
      if (error instanceof UserAlreadyExistsError) {
        this.eventLogger.failure('auth.register.denied', {
          reason: 'email_already_registered',
          email: input.email,
        });
        throw new RegistrationNotAllowedError('email_already_registered');
      }

      throw error;
    }
  }
}
