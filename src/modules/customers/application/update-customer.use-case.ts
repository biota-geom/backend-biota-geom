import { Injectable } from '@nestjs/common';
import { Customer } from '../domain/customer.entity';
import { CustomerRepository } from '../domain/customers.repository';
import { CustomerNotFoundError } from '../domain/errors/customer-not-found.error';
import type { UpdateCustomerData } from '../domain/update-customer.data';

@Injectable()
export class UpdateCustomerUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(
    id: string,
    ownerUserId: string,
    data: UpdateCustomerData,
  ): Promise<Customer> {
    // Scoped lookup: a customer owned by another account is reported as not
    // found rather than forbidden, so the response never confirms it exists.
    const existing = await this.customerRepository.findById(id, ownerUserId);

    if (!existing) {
      throw new CustomerNotFoundError(id);
    }

    return this.customerRepository.update(id, ownerUserId, data);
  }
}
