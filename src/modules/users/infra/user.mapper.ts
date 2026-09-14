import { User as PrismaUser } from '@prisma/client';
import { User } from '../domain/user.entity';

export function toDomainUser(row: PrismaUser): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.passwordHash,
    isActive: row.isActive,
    isAdmin: row.isAdmin,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastLoginAt: row.lastLoginAt,
  };
}
