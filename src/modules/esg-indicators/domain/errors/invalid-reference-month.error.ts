export class InvalidReferenceMonthError extends Error {
  constructor(month: string) {
    super(`Reference month "${month}" is not a valid YYYY-MM value`);
    this.name = 'InvalidReferenceMonthError';
  }
}
