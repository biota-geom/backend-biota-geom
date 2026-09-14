import { Injectable } from '@nestjs/common';
import { Customer } from './customer.entity';

@Injectable()
export abstract class CustomerRepository {
  abstract findAll(): Promise<Customer[]>;
  abstract findOne(id: string): Promise<Customer | null>;
  abstract remove(id: string): Promise<boolean>;
}
