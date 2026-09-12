export class EsgMetricsNotFoundError extends Error {
  constructor() {
    super('One or more ESG metrics were not found');
    this.name = 'EsgMetricsNotFoundError';
  }
}
