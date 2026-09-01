import { Module } from '@nestjs/common';
import { UserRepository } from './domain/user.repository';
import { PrismaUserRepository } from './infra/prisma-user.repository';

@Module({
  providers: [{ provide: UserRepository, useClass: PrismaUserRepository }],
  exports: [UserRepository],
})
export class UsersModule {}
