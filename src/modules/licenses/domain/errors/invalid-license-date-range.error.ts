export class InvalidLicenseDateRangeError extends Error {
  constructor() {
    super('expirationDate must be after issueDate');
    this.name = 'InvalidLicenseDateRangeError';
  }
}
