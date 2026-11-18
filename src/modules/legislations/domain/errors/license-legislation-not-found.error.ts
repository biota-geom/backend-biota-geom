export class LicenseLegislationNotFoundError extends Error {
  constructor(id: string, licenseId?: string) {
    super(
      licenseId
        ? `License legislation "${id}" does not exist in license "${licenseId}"`
        : `License legislation "${id}" does not exist`,
    );
    this.name = 'LicenseLegislationNotFoundError';
  }
}
