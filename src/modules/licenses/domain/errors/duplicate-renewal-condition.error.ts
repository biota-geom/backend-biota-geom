export class DuplicateRenewalConditionError extends Error {
  constructor() {
    super('Each condition of the previous license must be decided only once.');
    this.name = 'DuplicateRenewalConditionError';
  }
}
