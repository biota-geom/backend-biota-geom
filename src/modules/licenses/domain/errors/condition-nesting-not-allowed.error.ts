export class ConditionNestingNotAllowedError extends Error {
  constructor() {
    super('A condition sub-item cannot have sub-items.');
    this.name = ConditionNestingNotAllowedError.name;
  }
}
