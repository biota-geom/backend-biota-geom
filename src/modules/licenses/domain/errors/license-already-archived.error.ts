export class LicenseAlreadyArchivedError extends Error {
  constructor(licenseId: string) {
    super(`License ${licenseId} is already archived.`);
  }
}
