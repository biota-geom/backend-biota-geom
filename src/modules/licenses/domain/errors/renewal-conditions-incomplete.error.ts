export class RenewalConditionsIncompleteError extends Error {
  constructor() {
    super(
      'Every condition of the previous license must be marked exactly once.',
    );
    this.name = 'RenewalConditionsIncompleteError';
  }
}
