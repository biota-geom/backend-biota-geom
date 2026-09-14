import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCustomerUseCase } from '../application/create-customer.use-case';
import { FindCustomerUseCase } from '../application/find-a-customer.use-case';
import { ListCustomersUseCase } from '../application/list-customers.use-case';
import { RemoveCustomerUseCase } from '../application/remove-customer.use-case';
import { UpdateCustomerUseCase } from '../application/update-customer.use-case';
import { CreateCustomerData } from '../domain/create-customer.data';
import { Customer } from '../domain/customer.entity';
import {
  CustomerDetailResponseDto,
  toCustomerDetailResponse,
} from '../presentation/dto/customer-detail-response.dto';
import { CustomerListResponseDTO } from '../presentation/dto/customer-list-response.dto';
import { CustomerResponseDTO } from '../presentation/dto/customer-response.dto';
import { UpdateCustomerDto } from '../presentation/dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly listCustomersUseCase: ListCustomersUseCase,
    private readonly createCustomerUseCase: CreateCustomerUseCase,
    private readonly findCustomerUseCase: FindCustomerUseCase,
    private readonly updateCustomerUseCase: UpdateCustomerUseCase,
    private readonly removeCustomerUseCase: RemoveCustomerUseCase,
  ) {}

  async findAll(): Promise<CustomerListResponseDTO[]> {
    return this.listCustomersUseCase.listCustomers();
  }

  async create(data: CreateCustomerData): Promise<Customer> {
    return this.createCustomerUseCase.createCustomer(data);
  }

  async findOne(id: string): Promise<CustomerResponseDTO> {
    const customer = await this.findCustomerUseCase.findCustomer(id);

    if (!customer) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return customer;
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
    });

    return toCustomerDetailResponse(customer);
  }

  async remove(id: string): Promise<boolean> {
    const removed = await this.removeCustomerUseCase.removeCustomer(id);

    if (!removed) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return true;
  }
}
