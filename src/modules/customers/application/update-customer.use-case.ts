import { Injectable } from '@nestjs/common';
import { Customer } from '../domain/customer.entity';
import { CustomerRepository } from '../domain/customers.repository';
import { CustomerNotFoundError } from '../domain/errors/customer-not-found.error';
import type { UpdateCustomerData } from '../domain/update-customer.data';

@Injectable()
export class UpdateCustomerUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(id: string, data: UpdateCustomerData): Promise<Customer> {
    const existing = await this.customerRepository.findById(id);

    if (!existing) {
      throw new CustomerNotFoundError(id);
    }

    return this.customerRepository.update(id, data);
  }
}
