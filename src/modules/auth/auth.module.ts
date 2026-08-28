import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { PtBrThrottlerGuard } from '../../common/throttler/pt-br-throttler.guard';
import { UsersModule } from '../users/users.module';
import { GetCurrentUserUseCase } from './application/get-current-user.use-case';
import { AuthEventLogger } from './application/auth-event.logger';
import { LoginUserUseCase } from './application/login-user.use-case';
import { RefreshAccessTokenUseCase } from './application/refresh-access-token.use-case';
import { RegisterUserUseCase } from './application/register-user.use-case';
import { PasswordHasher } from './domain/password-hasher';
import { TokenService } from './domain/token-service';
import { Argon2PasswordHasher } from './infra/argon2-password-hasher';
import { AuthConfigService } from './infra/auth-config.service';
import { JwtTokenService } from './infra/jwt-token.service';
import { AuthController } from './presentation/auth.controller';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';

@Module({
  imports: [
    UsersModule,
    JwtModule.register({}),
    /*
     * Scoped to this module (not global) so rate limiting only ever applies
     * to the auth endpoints that opt in via @Throttle() — a health check or
     * any future unrelated route is never at risk of tripping it.
     */
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 20 }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthConfigService,
    AuthEventLogger,
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
    { provide: TokenService, useClass: JwtTokenService },
    RegisterUserUseCase,
    LoginUserUseCase,
    RefreshAccessTokenUseCase,
    GetCurrentUserUseCase,
    JwtAuthGuard,
    PtBrThrottlerGuard,
  ],
  exports: [TokenService, JwtAuthGuard],
})
export class AuthModule {}
