export class EsgMetricsInUseError extends Error {
  constructor(public readonly metricIds: string[]) {
    super(
      `ESG metrics still used by license conditions: ${metricIds.join(', ')}`,
    );
    this.name = 'EsgMetricsInUseError';
  }
}
