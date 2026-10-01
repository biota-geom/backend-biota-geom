export class LicenseConditionNotFoundError extends Error {
  constructor(licenseCondition: string) {
    super(`License condition "${licenseCondition}" does not exist`);
    this.name = 'LicenseConditionNotFoundError';
  }
}
