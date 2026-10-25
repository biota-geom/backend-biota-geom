export class IndicatorNotConfiguredError extends Error {
  constructor(indicatorIds: string[]) {
    super(
      `Indicators not configured for this customer: ${indicatorIds.join(', ')}`,
    );
    this.name = 'IndicatorNotConfiguredError';
  }
}
