import { Injectable } from '@nestjs/common';
import { User } from '../../users/domain/user.entity';
import { UserRepository } from '../../users/domain/user.repository';
import { InvalidTokenError } from '../domain/errors/invalid-token.error';

@Injectable()
export class GetCurrentUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);

    if (!user || !user.isActive) {
      /*
       * Reached via an access token (through JwtAuthGuard) — no refresh
       * token is involved in this path, so InvalidRefreshTokenError would
       * be the wrong error semantically even though it maps to the same
       * 401 today.
       */
      throw new InvalidTokenError();
    }

    return user;
  }
}
