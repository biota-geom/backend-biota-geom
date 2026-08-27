import { Injectable } from '@nestjs/common';
import { User } from '../../users/domain/user.entity';
import { UserRepository } from '../../users/domain/user.repository';
import { InvalidRefreshTokenError } from '../domain/errors/invalid-refresh-token.error';

@Injectable()
export class GetCurrentUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);

    if (!user || !user.isActive) {
      throw new InvalidRefreshTokenError();
    }

    return user;
  }
}
