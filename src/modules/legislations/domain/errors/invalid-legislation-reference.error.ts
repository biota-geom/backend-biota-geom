/** Raised when a radar entry names neither, or both, an existing act and a new one. */
export class InvalidLegislationReferenceError extends Error {
  constructor() {
    super('Provide either legislation_id or the legislation data, not both');
    this.name = 'InvalidLegislationReferenceError';
  }
}
