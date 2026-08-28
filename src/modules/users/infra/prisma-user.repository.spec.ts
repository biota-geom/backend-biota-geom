import { Prisma, User as PrismaUser } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserAlreadyExistsError } from '../domain/user-already-exists.error';
import { PrismaUserRepository } from './prisma-user.repository';

const ROW: PrismaUser = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john.doe@biotageom.com.br',
  passwordHash: 'hashed',
  isActive: true,
  isAdmin: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  lastLoginAt: null,
};

function buildRepository() {
  const findUnique = jest.fn();
  const create = jest.fn();
  const update = jest.fn();
  const prisma = {
    user: { findUnique, create, update },
  } as unknown as PrismaService;

  return {
    repository: new PrismaUserRepository(prisma),
    findUnique,
    create,
    update,
  };
}

describe('PrismaUserRepository', () => {
  it('findByEmail normalizes the email and maps a found row', async () => {
    const { repository, findUnique } = buildRepository();
    findUnique.mockResolvedValue(ROW);

    const user = await repository.findByEmail('  John.Doe@Biotageom.com.br ');

    expect(findUnique).toHaveBeenCalledWith({
      where: { email: 'john.doe@biotageom.com.br' },
    });
    expect(user?.id).toBe('user-1');
  });

  it('findByEmail returns null when no row is found', async () => {
    const { repository, findUnique } = buildRepository();
    findUnique.mockResolvedValue(null);

    await expect(
      repository.findByEmail('nobody@biotageom.com.br'),
    ).resolves.toBeNull();
  });

  it('findById maps a found row', async () => {
    const { repository, findUnique } = buildRepository();
    findUnique.mockResolvedValue(ROW);

    const user = await repository.findById('user-1');

    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    expect(user?.id).toBe('user-1');
  });

  it('findById returns null when no row is found', async () => {
    const { repository, findUnique } = buildRepository();
    findUnique.mockResolvedValue(null);

    await expect(repository.findById('missing-id')).resolves.toBeNull();
  });

  it('creates a user, normalizing the email', async () => {
    const { repository, create } = buildRepository();
    create.mockResolvedValue(ROW);

    const user = await repository.create({
      name: 'John Doe',
      email: ' John.Doe@Biotageom.com.br ',
      passwordHash: 'hashed',
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        name: 'John Doe',
        email: 'john.doe@biotageom.com.br',
        passwordHash: 'hashed',
      },
    });
    expect(user.id).toBe('user-1');
  });

  it('translates a unique-constraint violation into UserAlreadyExistsError', async () => {
    const { repository, create } = buildRepository();
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.9.1',
      }),
    );

    await expect(
      repository.create({
        name: 'John Doe',
        email: 'john.doe@biotageom.com.br',
        passwordHash: 'hashed',
      }),
    ).rejects.toThrow(UserAlreadyExistsError);
  });

  it('propagates an unrelated Prisma error unchanged', async () => {
    const { repository, create } = buildRepository();
    const otherError = new Prisma.PrismaClientKnownRequestError(
      'Some other failure',
      {
        code: 'P2025',
        clientVersion: '7.9.1',
      },
    );
    create.mockRejectedValue(otherError);

    await expect(
      repository.create({
        name: 'John Doe',
        email: 'john.doe@biotageom.com.br',
        passwordHash: 'hashed',
      }),
    ).rejects.toBe(otherError);
  });

  it('propagates a completely unrelated error unchanged', async () => {
    const { repository, create } = buildRepository();
    const otherError = new Error('connection lost');
    create.mockRejectedValue(otherError);

    await expect(
      repository.create({
        name: 'John Doe',
        email: 'john.doe@biotageom.com.br',
        passwordHash: 'hashed',
      }),
    ).rejects.toBe(otherError);
  });

  it('touches lastLoginAt via an update call', async () => {
    const { repository, update } = buildRepository();
    update.mockResolvedValue(ROW);
    const when = new Date('2026-03-01T00:00:00.000Z');

    await repository.touchLastLogin('user-1', when);

    expect(update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { lastLoginAt: when },
    });
  });
});
