export class InvalidConditionAlertDateError extends Error {
  constructor() {
    super('Condition alert date cannot be after its due date');
    this.name = 'InvalidConditionAlertDateError';
  }
}
