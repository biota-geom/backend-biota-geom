import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../domain/customers.repository';
import { CustomerListResponseDTO } from '../presentation/dto/customer-list-response.dto';

@Injectable()
export class ListCustomersUseCase {
  constructor(private readonly repository: CustomerRepository) {}

  async listCustomers(): Promise<CustomerListResponseDTO[]> {
    const customers = await this.repository.findAll();

    return customers.map((customer) => {
      const city = customer.address?.city ?? '';
      const state = customer.address?.state ?? '';
      const location = [city, state].filter(Boolean).join(' - ');

      return {
        id: customer.id,
        name: customer.name,
        status: customer.isActive ? 'Ativo' : 'Inativo',
        segment: customer.sector?.name ?? '',
        location,
      };
    });
  }
}
