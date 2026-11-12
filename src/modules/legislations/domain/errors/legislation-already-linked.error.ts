export class LegislationAlreadyLinkedError extends Error {
  constructor(legislationId: string) {
    super(`Legislation "${legislationId}" is already on the license radar`);
    this.name = 'LegislationAlreadyLinkedError';
  }
}
