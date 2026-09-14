import { refreshSchema } from './refresh.schema';

describe('refreshSchema', () => {
  it('maps refresh_token to refreshToken', () => {
    const result = refreshSchema.parse({ refresh_token: 'some.jwt.token' });

    expect(result).toEqual({ refreshToken: 'some.jwt.token' });
  });

  it('rejects an empty refresh_token', () => {
    expect(() => refreshSchema.parse({ refresh_token: '' })).toThrow();
  });

  it('rejects a missing refresh_token', () => {
    expect(() => refreshSchema.parse({})).toThrow();
  });
});
