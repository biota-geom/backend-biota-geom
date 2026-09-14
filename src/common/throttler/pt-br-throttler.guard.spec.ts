import { ThrottlerException } from '@nestjs/throttler';
import { AUTH_MESSAGES } from '../../modules/auth/presentation/messages/auth.messages.pt-br';
import { PtBrThrottlerGuard } from './pt-br-throttler.guard';

describe('PtBrThrottlerGuard', () => {
  it('rejects with a ThrottlerException carrying the PT-BR message', async () => {
    const guard = Object.create(
      PtBrThrottlerGuard.prototype,
    ) as PtBrThrottlerGuard;

    await expect(
      (
        guard as unknown as {
          throwThrottlingException: () => Promise<void>;
        }
      ).throwThrottlingException(),
    ).rejects.toMatchObject(
      new ThrottlerException(AUTH_MESSAGES.TOO_MANY_ATTEMPTS),
    );
  });
});
