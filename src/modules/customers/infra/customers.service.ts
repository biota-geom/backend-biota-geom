import { Injectable } from '@nestjs/common';
import { ListCustomersUseCase } from '../application/list-customers.use-case';
import { UpdateCustomerUseCase } from '../application/update-customer.use-case';
import {
  CustomerDetailResponseDto,
  toCustomerDetailResponse,
} from '../presentation/dto/customer-detail-response.dto';
import { CustomerResponseDTO } from '../presentation/dto/customer-responde.dto';
import { UpdateCustomerDto } from '../presentation/dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly listCustomersUseCase: ListCustomersUseCase,
    private readonly updateCustomerUseCase: UpdateCustomerUseCase,
  ) {}

  async findAll(): Promise<CustomerResponseDTO[]> {
    return this.listCustomersUseCase.listCustomers();
  }

  async update(
    id: string,
    dto: UpdateCustomerDto,
  ): Promise<CustomerDetailResponseDto> {
    const customer = await this.updateCustomerUseCase.execute(id, {
      name: dto.name,
      document: dto.document,
      documentType: dto.document_type,
      email: dto.email,
      sectorId: dto.sector_id,
      ownerName: dto.responsible_name,
      ownerEmail: dto.responsible_email,
      ownerPhone: dto.responsible_phone,
      address: dto.address
        ? {
            type: dto.address.type,
            street: dto.address.street,
            number: dto.address.number,
            city: dto.address.city,
            state: dto.address.state,
            postalCode: dto.address.postal_code,
            countryCode: dto.address.country_code,
          }
        : undefined,
      esgIndicatorIds: dto.esg_indicator_ids,
    });

    return toCustomerDetailResponse(customer);
  }
}
