export class IssuingAgencyNotFoundError extends Error {
  constructor(issuingAgencyId: string) {
    super(`Issuing agency "${issuingAgencyId}" does not exist`);
    this.name = 'IssuingAgencyNotFoundError';
  }
}
