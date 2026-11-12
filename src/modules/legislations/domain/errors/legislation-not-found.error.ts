export class LegislationNotFoundError extends Error {
  constructor(legislationId: string) {
    super(`Legislation "${legislationId}" does not exist`);
    this.name = 'LegislationNotFoundError';
  }
}
