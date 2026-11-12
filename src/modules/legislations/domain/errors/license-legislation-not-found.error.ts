export class LicenseLegislationNotFoundError extends Error {
  constructor(licenseLegislationId: string) {
    super(`License legislation "${licenseLegislationId}" does not exist`);
    this.name = 'LicenseLegislationNotFoundError';
  }
}
