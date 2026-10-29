export class InvalidRenewalDueDateError extends Error {
  constructor() {
    super(
      'A copied condition needs a due date between today and the new license expiration date.',
    );
    this.name = 'InvalidRenewalDueDateError';
  }
}
