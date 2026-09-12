export class InvalidEsgIndicatorIdsError extends Error {
  constructor(public readonly invalidIds: string[]) {
    super(
      `The following ESG indicator ids do not exist: ${invalidIds.join(', ')}`,
    );
    this.name = 'InvalidEsgIndicatorIdsError';
  }
}
