export class InvalidConditionParentError extends Error {
  constructor() {
    super('Condition parent must belong to the same license and descriptor.');
    this.name = InvalidConditionParentError.name;
  }
}
