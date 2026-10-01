export class InvalidConditionTargetError extends Error {
  constructor() {
    super(
      'Target metric, operator and value must be provided together or all omitted',
    );
    this.name = 'InvalidConditionTargetError';
  }
}
