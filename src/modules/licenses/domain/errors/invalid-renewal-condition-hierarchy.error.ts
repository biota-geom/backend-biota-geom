export class InvalidRenewalConditionHierarchyError extends Error {
  constructor() {
    super('A copied condition sub-item requires its parent to be copied.');
    this.name = InvalidRenewalConditionHierarchyError.name;
  }
}
