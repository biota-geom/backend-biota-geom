export class LicenseLegislationNotFoundError extends Error {
  constructor(id: string, licenseId: string) {
    super(
      `License legislation "${id}" does not exist in license "${licenseId}"`,
    );
    this.name = 'LicenseLegislationNotFoundError';
  }
}
