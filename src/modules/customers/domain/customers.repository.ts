import { Injectable } from '@nestjs/common';
import { Customer } from './customer.entity';

@Injectable()
export abstract class CustomerRepository {
  abstract findAll(): Promise<Customer[]>;
  abstract remove(id: string): Promise<boolean>;
}
