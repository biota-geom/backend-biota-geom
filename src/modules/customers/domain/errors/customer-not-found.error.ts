export class CustomerNotFoundError extends Error {
  constructor(customerId: string) {
    super(`Customer "${customerId}" was not found`);
    this.name = 'CustomerNotFoundError';
  }
}
