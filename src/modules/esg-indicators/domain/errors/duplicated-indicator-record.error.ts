export class DuplicatedIndicatorRecordError extends Error {
  constructor(indicatorId: string) {
    super(`Indicator ${indicatorId} appears more than once in the request`);
    this.name = 'DuplicatedIndicatorRecordError';
  }
}
