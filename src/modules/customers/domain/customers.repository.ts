import { Injectable } from '@nestjs/common';
import { Customer } from './customer.entity';
import type { UpdateCustomerData } from './update-customer.data';

@Injectable()
export abstract class CustomerRepository {
  abstract findAll(): Promise<Customer[]>;
  abstract findById(id: string): Promise<Customer | null>;
  abstract update(id: string, data: UpdateCustomerData): Promise<Customer>;
}
