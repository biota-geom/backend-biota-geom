export class LicenseNotFoundError extends Error {
  constructor(licenseId: string) {
    super(`License "${licenseId}" does not exist`);
    this.name = 'LicenseNotFoundError';
  }
}
