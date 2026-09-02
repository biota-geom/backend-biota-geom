import { randomUUID } from 'node:crypto';
import { CreateUserInput, normalizeEmail, User } from '../domain/user.entity';
import { UserAlreadyExistsError } from '../domain/user-already-exists.error';
import { UserRepository } from '../domain/user.repository';

export class InMemoryUserRepository implements UserRepository {
  private readonly usersById = new Map<string, User>();

  findByEmail(email: string): Promise<User | null> {
    const normalized = normalizeEmail(email);
    const found = [...this.usersById.values()].find(
      (user) => user.email === normalized,
    );

    return Promise.resolve(found ?? null);
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.usersById.get(id) ?? null);
  }

  async create(input: CreateUserInput): Promise<User> {
    const email = normalizeEmail(input.email);

    if (await this.findByEmail(email)) {
      throw new UserAlreadyExistsError(email);
    }

    const now = new Date();
    const user: User = {
      id: randomUUID(),
      name: input.name,
      email,
      passwordHash: input.passwordHash,
      isActive: true,
      isAdmin: false,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    };

    this.usersById.set(user.id, user);

    return user;
  }

  touchLastLogin(id: string, when: Date): Promise<void> {
    const user = this.usersById.get(id);

    if (user) {
      this.usersById.set(id, { ...user, lastLoginAt: when, updatedAt: when });
    }

    return Promise.resolve();
  }
}
