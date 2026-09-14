export class EsgMetricAlreadyExistsError extends Error {
  constructor(name: string) {
    super(`An ESG metric with name "${name}" already exists for this customer`);
    this.name = 'EsgMetricAlreadyExistsError';
  }
}
