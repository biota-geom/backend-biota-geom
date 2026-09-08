import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvVars } from '../../../config/env.validation';
import { parseDurationToSeconds } from '../domain/duration';

@Injectable()
export class AuthConfigService {
  constructor(private readonly config: ConfigService<EnvVars, true>) {}

  get accessSecret(): string {
    return this.config.get('JWT_ACCESS_SECRET', { infer: true });
  }

  get refreshSecret(): string {
    return this.config.get('JWT_REFRESH_SECRET', { infer: true });
  }

  get accessTtl(): string {
    return this.config.get('JWT_ACCESS_TTL', { infer: true });
  }

  get refreshTtl(): string {
    return this.config.get('JWT_REFRESH_TTL', { infer: true });
  }

  get accessTtlSeconds(): number {
    return parseDurationToSeconds(this.accessTtl);
  }

  get issuer(): string {
    return this.config.get('JWT_ISSUER', { infer: true });
  }

  get audience(): string {
    return this.config.get('JWT_AUDIENCE', { infer: true });
  }

  get allowedEmailDomain(): string {
    return this.config.get('AUTH_ALLOWED_EMAIL_DOMAIN', { infer: true });
  }

  get corsOrigins(): string[] {
    return this.config
      .get('CORS_ORIGINS', { infer: true })
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }
}
