import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCustomerUseCase } from '../application/create-customer.use-case';
import { ListCustomersUseCase } from '../application/list-customers.use-case';
import { RemoveCustomerUseCase } from '../application/remove-customer.use-case';
import { CreateCustomerData } from '../domain/create-customer.data';
import { Customer } from '../domain/customer.entity';
import { CustomerResponseDTO } from '../presentation/dto/customer-responde.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly listCustomersUseCase: ListCustomersUseCase,
    private readonly createCustomerUseCase: CreateCustomerUseCase,
    private readonly removeCustomerUseCase: RemoveCustomerUseCase,
  ) {}

  async findAll(): Promise<CustomerResponseDTO[]> {
    return this.listCustomersUseCase.listCustomers();
  }

  async create(data: CreateCustomerData): Promise<Customer> {
    return this.createCustomerUseCase.createCustomer(data);
  }

  async remove(id: string): Promise<boolean> {
    const removed = await this.removeCustomerUseCase.removeCustomer(id);

    if (!removed) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return true;
  }
}
