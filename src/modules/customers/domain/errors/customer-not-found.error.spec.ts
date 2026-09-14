import { CustomerNotFoundError } from './customer-not-found.error';

describe('CustomerNotFoundError', () => {
  it('carries the customer id in its message and sets its name', () => {
    const error = new CustomerNotFoundError('customer-1');

    expect(error.name).toBe('CustomerNotFoundError');
    expect(error.message).toContain('customer-1');
    expect(error).toBeInstanceOf(Error);
  });
});
