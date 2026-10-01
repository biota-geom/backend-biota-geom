export class InvalidConditionDueDateError extends Error {
  constructor() {
    super('Condition due date is required and must be a valid date');
    this.name = 'InvalidConditionDueDateError';
  }
}
