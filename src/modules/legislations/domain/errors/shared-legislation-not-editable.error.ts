export class SharedLegislationNotEditableError extends Error {
  constructor(legislationId: string) {
    super(
      `Legislation "${legislationId}" is linked to other licenses and cannot be edited from one of them`,
    );
    this.name = 'SharedLegislationNotEditableError';
  }
}
