import { Argon2PasswordHasher } from './argon2-password-hasher';

describe('Argon2PasswordHasher', () => {
  const hasher = new Argon2PasswordHasher();

  it('produces a hash different from the plaintext password', async () => {
    const hash = await hasher.hash('Sup3r$ecret!');

    expect(hash).not.toBe('Sup3r$ecret!');
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it('verifies a correct password', async () => {
    const hash = await hasher.hash('Sup3r$ecret!');

    await expect(hasher.verify(hash, 'Sup3r$ecret!')).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hasher.hash('Sup3r$ecret!');

    await expect(hasher.verify(hash, 'wrong-password')).resolves.toBe(false);
  });

  it('salts hashes so the same password hashes differently each time', async () => {
    const [first, second] = await Promise.all([
      hasher.hash('Sup3r$ecret!'),
      hasher.hash('Sup3r$ecret!'),
    ]);

    expect(first).not.toBe(second);
  });
});
