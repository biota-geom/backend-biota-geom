export class LicenseNotFoundError extends Error {
  constructor(licenseId: string) {
    super(`License "${licenseId}" was not found`);
    this.name = 'LicenseNotFoundError';
  }
}
