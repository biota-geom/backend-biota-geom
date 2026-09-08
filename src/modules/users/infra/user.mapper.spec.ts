import { User as PrismaUser } from '@prisma/client';
import { toDomainUser } from './user.mapper';

describe('toDomainUser', () => {
  it('maps a Prisma row to the domain User shape', () => {
    const row: PrismaUser = {
      id: 'user-1',
      name: 'John Doe',
      email: 'john.doe@biotageom.com.br',
      passwordHash: 'hashed',
      isActive: true,
      isAdmin: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      lastLoginAt: null,
    };

    expect(toDomainUser(row)).toEqual({
      id: 'user-1',
      name: 'John Doe',
      email: 'john.doe@biotageom.com.br',
      passwordHash: 'hashed',
      isActive: true,
      isAdmin: false,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastLoginAt: null,
    });
  });
});
