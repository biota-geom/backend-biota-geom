import { LicenseConditionNotFoundError } from './license-condition-not-found.error';

describe('LicenseConditionNotFoundError', () => {
  it('contains the condition identifier', () => {
    const error = new LicenseConditionNotFoundError('condition-1');

    expect(error.name).toBe('LicenseConditionNotFoundError');
    expect(error.message).toContain('condition-1');
  });
});
