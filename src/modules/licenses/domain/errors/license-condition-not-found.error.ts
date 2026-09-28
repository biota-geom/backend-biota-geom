export class LicenseConditionNotFoundError extends Error {
  constructor(conditionId: string) {
    super(`License condition "${conditionId}" was not found`);
    this.name = 'LicenseConditionNotFoundError';
  }
}
