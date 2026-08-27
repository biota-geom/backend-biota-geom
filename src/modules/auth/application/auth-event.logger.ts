import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';

export type AuthEventName =
  | 'auth.register.success'
  | 'auth.register.denied'
  | 'auth.login.success'
  | 'auth.login.failure'
  | 'auth.refresh.success'
  | 'auth.refresh.failure';

export interface AuthEventDetails {
  reason?: string;
  userId?: string;
  email?: string;
}

// Never log passwords, password hashes, or raw JWTs. Emails are hashed —
// never logged in the clear — so logs stay useful for correlating repeated
// attempts against one account without becoming a plaintext PII dump (LGPD).
@Injectable()
export class AuthEventLogger {
  private readonly logger = new Logger('AuthEvent');

  success(event: AuthEventName, details: AuthEventDetails = {}): void {
    this.logger.log(this.format(event, 'success', details));
  }

  failure(event: AuthEventName, details: AuthEventDetails = {}): void {
    this.logger.warn(this.format(event, 'failure', details));
  }

  private format(
    event: AuthEventName,
    outcome: 'success' | 'failure',
    details: AuthEventDetails,
  ) {
    return {
      event,
      outcome,
      reason: details.reason ?? null,
      userId: details.userId ?? null,
      emailHash: details.email ? hashEmail(details.email) : null,
    };
  }
}

function hashEmail(email: string): string {
  return createHash('sha256')
    .update(email.trim().toLowerCase())
    .digest('hex')
    .slice(0, 12);
}
