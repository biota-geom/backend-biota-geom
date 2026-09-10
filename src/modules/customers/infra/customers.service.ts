import { Injectable, NotFoundException } from '@nestjs/common';
import { FindCustomerUseCase } from '../application/find-a-customer.use-case';
import { ListCustomersUseCase } from '../application/list-customers.use-case';
import { CustomerListResponseDTO } from '../presentation/dto/customer-list-response.dto';
import { CustomerResponseDTO } from '../presentation/dto/customer-response.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly listCustomersUseCase: ListCustomersUseCase,
    private readonly findCustomerUseCase: FindCustomerUseCase,
  ) {}

  async findAll(): Promise<CustomerListResponseDTO[]> {
    return this.listCustomersUseCase.listCustomers();
  }

  async findOne(id: string): Promise<CustomerResponseDTO> {
    const customer = await this.findCustomerUseCase.findCustomer(id);

    if (!customer) {
      throw new NotFoundException('Empresa não encontrada ou acesso negado');
    }

    return customer;
  }
}
