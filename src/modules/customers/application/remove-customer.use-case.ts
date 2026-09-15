import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../domain/customers.repository';

@Injectable()
export class RemoveCustomerUseCase {
  constructor(private readonly repository: CustomerRepository) {}

  // Returns false for a customer owned by another account, the same answer an
  // unknown id gets, so the caller reports 404 either way.
  async removeCustomer(id: string, ownerUserId: string): Promise<boolean> {
    return this.repository.remove(id, ownerUserId);
  }
}
