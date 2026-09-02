import { UserAlreadyExistsError } from '../domain/user-already-exists.error';
import { InMemoryUserRepository } from './in-memory-user.repository';

describe('InMemoryUserRepository', () => {
  it('creates and finds a user by email and id', async () => {
    const repository = new InMemoryUserRepository();

    const user = await repository.create({
      name: 'John Doe',
      email: 'John.Doe@Biotageom.com.br',
      passwordHash: 'hashed:whatever',
    });

    expect(user.email).toBe('john.doe@biotageom.com.br');
    await expect(
      repository.findByEmail('john.doe@biotageom.com.br'),
    ).resolves.toEqual(user);
    await expect(repository.findById(user.id)).resolves.toEqual(user);
  });

  it('returns null for an email or id that does not exist', async () => {
    const repository = new InMemoryUserRepository();

    await expect(
      repository.findByEmail('nobody@biotageom.com.br'),
    ).resolves.toBeNull();
    await expect(repository.findById('missing-id')).resolves.toBeNull();
  });

  it('rejects creating a user with a duplicate email', async () => {
    const repository = new InMemoryUserRepository();
    await repository.create({
      name: 'John Doe',
      email: 'john.doe@biotageom.com.br',
      passwordHash: 'hashed:whatever',
    });

    await expect(
      repository.create({
        name: 'John Doe',
        email: 'john.doe@biotageom.com.br',
        passwordHash: 'hashed:whatever',
      }),
    ).rejects.toThrow(UserAlreadyExistsError);
  });

  it('updates lastLoginAt for an existing user', async () => {
    const repository = new InMemoryUserRepository();
    const user = await repository.create({
      name: 'John Doe',
      email: 'john.doe@biotageom.com.br',
      passwordHash: 'hashed:whatever',
    });
    const now = new Date();

    await repository.touchLastLogin(user.id, now);

    await expect(repository.findById(user.id)).resolves.toMatchObject({
      lastLoginAt: now,
    });
  });

  it('does nothing when touching lastLoginAt for a non-existent user', async () => {
    const repository = new InMemoryUserRepository();

    await expect(
      repository.touchLastLogin('missing-id', new Date()),
    ).resolves.toBeUndefined();
  });
});
