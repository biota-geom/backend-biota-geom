import { Injectable, NotFoundException } from '@nestjs/common';
import { ListCustomersUseCase } from '../application/list-customers.use-case';
import { RemoveCustomerUseCase } from '../application/remove-customer.use-case';
import { CustomerResponseDTO } from '../presentation/dto/customer-responde.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly listCustomersUseCase: ListCustomersUseCase,
    private readonly removeCustomerUseCase: RemoveCustomerUseCase,
  ) {}

  async findAll(): Promise<CustomerResponseDTO[]> {
    return this.listCustomersUseCase.listCustomers();
  }

  async remove(id: string): Promise<boolean> {
    const removed = await this.removeCustomerUseCase.removeCustomer(id);

    if (!removed) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return true;
  }
}
