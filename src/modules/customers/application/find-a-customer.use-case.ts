import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../domain/customers.repository';
import { CustomerResponseDTO } from '../presentation/dto/customer-response.dto';

@Injectable()
export class FindCustomerUseCase {
  constructor(private readonly repository: CustomerRepository) {}

  async findCustomer(id: string): Promise<CustomerResponseDTO | null> {
    const customer = await this.repository.findOne(id);
    if (!customer) {
      return null;
    }

    const city = customer.address?.city ?? '';
    const state = customer.address?.state ?? '';
    const sectorId = customer.sector?.id ?? '';
    const sectorName = customer.sector?.name ?? '';
    return {
      id: customer.id,
      name: customer.name,
      document: customer.document,
      document_type: customer.documentType,
      status: customer.isActive ? 'active' : 'inactive',
      sector: { id: sectorId, name: sectorName },
      address: { city, state },
    };
  }
}
