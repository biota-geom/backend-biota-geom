import { EsgMetricsNotFoundError } from './esg-metrics-not-found.error';

describe('EsgMetricsNotFoundError', () => {
  it('sets its name and a stable English message', () => {
    const error = new EsgMetricsNotFoundError();

    expect(error.name).toBe('EsgMetricsNotFoundError');
    expect(error.message).toBe('One or more ESG metrics were not found');
    expect(error).toBeInstanceOf(Error);
  });
});
