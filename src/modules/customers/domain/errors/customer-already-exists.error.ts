export class CustomerAlreadyExistsError extends Error {
  constructor(document: string) {
    super(`A customer with document "${document}" already exists`);
    this.name = 'CustomerAlreadyExistsError';
  }
}
