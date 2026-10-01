export class ConditionCategoryNotFoundError extends Error {
  constructor(esgMetricId: string) {
    super(`GRI parameter "${esgMetricId}" was not found`);
    this.name = 'ConditionCategoryNotFoundError';
  }
}
