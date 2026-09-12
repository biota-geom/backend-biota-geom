import { Injectable } from '@nestjs/common';
import { SectorRepository } from '../../sectors/domain/sectors.repository';
import { CreateCustomerData } from '../domain/create-customer.data';
import { Customer } from '../domain/customer.entity';
import { CustomerRepository } from '../domain/customers.repository';
import { SectorNotFoundError } from '../domain/errors/sector-not-found.error';

@Injectable()
export class CreateCustomerUseCase {
  constructor(
    private readonly repository: CustomerRepository,
    private readonly sectorRepository: SectorRepository,
  ) {}

  async createCustomer(data: CreateCustomerData): Promise<Customer> {
    const sectorExists = await this.sectorRepository.existsById(data.sectorId);

    if (!sectorExists) {
      throw new SectorNotFoundError(data.sectorId);
    }

    /*
     * Duplicate documents are caught by the unique index inside the repository
     * rather than by a SELECT here: between a check and the insert another
     * request can slip through, so only the constraint is race-proof.
     */
    return this.repository.create(data);
  }
}
