import { PasswordHasher } from '../../src/modules/identity/infrastructure/password-hasher';

describe('PasswordHasher (Argon2id)', () => {
  const hasher = new PasswordHasher();

  it('hashes a password to a value distinct from the plain text', async () => {
    const hash = await hasher.hash('Sup3rSecret!');
    expect(hash).not.toBe('Sup3rSecret!');
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it('verifies a matching password', async () => {
    const hash = await hasher.hash('Sup3rSecret!');
    await expect(hasher.verify(hash, 'Sup3rSecret!')).resolves.toBe(true);
  });

  it('rejects a non-matching password', async () => {
    const hash = await hasher.hash('Sup3rSecret!');
    await expect(hasher.verify(hash, 'WrongPassword!')).resolves.toBe(false);
  });

  it('produces a different hash each time (random salt)', async () => {
    const [first, second] = await Promise.all([
      hasher.hash('Sup3rSecret!'),
      hasher.hash('Sup3rSecret!'),
    ]);
    expect(first).not.toBe(second);
  });
});
