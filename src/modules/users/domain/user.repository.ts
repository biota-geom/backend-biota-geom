import { CreateUserInput, User } from './user.entity';

export abstract class UserRepository {
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findById(id: string): Promise<User | null>;
  abstract create(input: CreateUserInput): Promise<User>;
  abstract touchLastLogin(id: string, when: Date): Promise<void>;
}
