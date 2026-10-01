export class ConditionCategoryNotLinkedError extends Error {
  constructor(esgMetricId: string) {
    super(`GRI parameter "${esgMetricId}" is not linked to the customer`);
    this.name = 'ConditionCategoryNotLinkedError';
  }
}
