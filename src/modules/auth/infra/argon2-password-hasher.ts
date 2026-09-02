import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import { PasswordHasher } from '../domain/password-hasher';

/*
 * A precomputed Argon2id hash with no corresponding real user, used to make
 * login take the same amount of time whether the email exists or not.
 */
export const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$8CKfn2UMtAC5q+izsrsLuw$yxdw0KVqz2qKwNPuuItdQMAczc3hd2qogqLqog/mbik';

@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  hash(plainPassword: string): Promise<string> {
    return hash(plainPassword);
  }

  verify(passwordHash: string, plainPassword: string): Promise<boolean> {
    return verify(passwordHash, plainPassword);
  }
}
