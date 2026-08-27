import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateUserInput, normalizeEmail, User } from '../domain/user.entity';
import { UserAlreadyExistsError } from '../domain/user-already-exists.error';
import { UserRepository } from '../domain/user.repository';
import { toDomainUser } from './user.mapper';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
    });

    return row ? toDomainUser(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });

    return row ? toDomainUser(row) : null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const email = normalizeEmail(input.email);

    try {
      const row = await this.prisma.user.create({
        data: {
          name: input.name,
          email,
          passwordHash: input.passwordHash,
        },
      });

      return toDomainUser(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new UserAlreadyExistsError(email);
      }

      throw error;
    }
  }

  async touchLastLogin(id: string, when: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: when },
    });
  }
}
