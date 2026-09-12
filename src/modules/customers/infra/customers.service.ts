import { Injectable } from '@nestjs/common';
import { CreateCustomerUseCase } from '../application/create-customer.use-case';
import { ListCustomersUseCase } from '../application/list-customers.use-case';
import { CreateCustomerData } from '../domain/create-customer.data';
import { Customer } from '../domain/customer.entity';
import { CustomerResponseDTO } from '../presentation/dto/customer-responde.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly listCustomersUseCase: ListCustomersUseCase,
    private readonly createCustomerUseCase: CreateCustomerUseCase,
  ) {}

  async findAll(): Promise<CustomerResponseDTO[]> {
    return this.listCustomersUseCase.listCustomers();
  }

  async create(data: CreateCustomerData): Promise<Customer> {
    return this.createCustomerUseCase.createCustomer(data);
  }
}
