import { Injectable } from '@nestjs/common';
import { CreateCustomerData } from './create-customer.data';
import { Customer } from './customer.entity';

@Injectable()
export abstract class CustomerRepository {
  abstract findAll(): Promise<Customer[]>;

  abstract create(data: CreateCustomerData): Promise<Customer>;
}
