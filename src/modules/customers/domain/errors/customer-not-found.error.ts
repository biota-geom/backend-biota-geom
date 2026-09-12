export class CustomerNotFoundError extends Error {
  constructor(id: string) {
    super(`Customer with id "${id}" was not found`);
    this.name = 'CustomerNotFoundError';
  }
}
