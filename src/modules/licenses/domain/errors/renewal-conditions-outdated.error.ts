export class RenewalConditionsOutdatedError extends Error {
  constructor() {
    super(
      'The renewal decisions do not match the current conditions of the previous license.',
    );
    this.name = 'RenewalConditionsOutdatedError';
  }
}
