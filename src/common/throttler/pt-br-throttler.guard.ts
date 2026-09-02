import { Injectable } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';
import { AUTH_MESSAGES } from '../../modules/auth/presentation/messages/auth.messages.pt-br';

@Injectable()
export class PtBrThrottlerGuard extends ThrottlerGuard {
  protected throwThrottlingException(): Promise<void> {
    throw new ThrottlerException(AUTH_MESSAGES.TOO_MANY_ATTEMPTS);
  }
}
