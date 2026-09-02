import { Injectable } from '@nestjs/common';
import { ListCustomersUseCase } from '../application/list-customers.use-case';
import { CustomerResponseDTO } from '../presentation/dto/customer-responde.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly listCustomersUseCase: ListCustomersUseCase) {}

  async findAll(): Promise<CustomerResponseDTO[]> {
    return this.listCustomersUseCase.listCustomers();
  }
}
