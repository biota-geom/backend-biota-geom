import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../domain/customers.repository';
import { CustomerResponseDTO } from '../presentation/dto/customer-response.dto';

@Injectable()
export class FindCustomerUseCase {
  constructor(private readonly repository: CustomerRepository) {}

  /*
   * A customer owned by someone else comes back as null, exactly like an id
   * that does not exist, and the caller turns both into 404. Telling the two
   * apart (403 vs 404) would confirm the id is real and let a client
   * enumerate other tenants' customers.
   */
  async findCustomer(
    id: string,
    ownerUserId: string,
  ): Promise<CustomerResponseDTO | null> {
    const customer = await this.repository.findOne(id, ownerUserId);
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
