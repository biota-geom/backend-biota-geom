import { UserAlreadyExistsError } from './user-already-exists.error';

describe('UserAlreadyExistsError', () => {
  it('carries the offending email in its message and sets its name', () => {
    const error = new UserAlreadyExistsError('john.doe@biotageom.com.br');

    expect(error.name).toBe('UserAlreadyExistsError');
    expect(error.message).toContain('john.doe@biotageom.com.br');
    expect(error).toBeInstanceOf(Error);
  });
});
