export class AlertNotFoundError extends Error {
  constructor() {
    super('Alert not found');
  }
}
