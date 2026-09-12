export class CustomerAddressNotFoundError extends Error {
  constructor(customerId: string) {
    super(`Customer with id "${customerId}" has no address to update`);
    this.name = 'CustomerAddressNotFoundError';
  }
}
