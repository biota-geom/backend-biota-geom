export class IndicatorAlreadyExistsError extends Error {
  constructor(name: string) {
    super(`The customer already has an indicator named "${name}"`);
    this.name = 'IndicatorAlreadyExistsError';
  }
}
