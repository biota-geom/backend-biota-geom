import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../domain/customers.repository';

@Injectable()
export class RemoveCustomerUseCase {
  constructor(private readonly repository: CustomerRepository) {}

  async removeCustomer(id: string): Promise<boolean> {
    return this.repository.remove(id);
  }
}
