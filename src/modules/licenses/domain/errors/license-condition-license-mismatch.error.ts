export class LicenseConditionLicenseMismatchError extends Error {
  constructor() {
    super('Condition licenseId does not match the route licenseId');
    this.name = 'LicenseConditionLicenseMismatchError';
  }
}
