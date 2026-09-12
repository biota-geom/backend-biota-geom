import {
  Body,
  Controller,
  Get,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { CustomersService } from '../infra/customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import {
  CustomerCreatedResponseDTO,
  toCustomerCreatedResponse,
} from './dto/customer-created-response.dto';
import { CustomerResponseDTO } from './dto/customer-responde.dto';
import { CustomersExceptionFilter } from './filters/customers-exception.filter';

@ApiTags('customers')
@UseFilters(CustomersExceptionFilter)
@Controller('customers')
export class CustomerController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all customer branches available to the authenticated admin.',
  })
  @ApiOkResponse({ type: CustomerResponseDTO, isArray: true })
  async listCustomers(): Promise<CustomerResponseDTO[]> {
    return this.service.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cadastra uma nova empresa.' })
  @ApiCreatedResponse({ type: CustomerCreatedResponseDTO })
  @ApiConflictResponse({ description: 'Já existe uma empresa com este CNPJ.' })
  @ApiUnprocessableEntityResponse({ description: 'Segmento inexistente.' })
  async createCustomer(
    @Body() dto: CreateCustomerDto,
  ): Promise<CustomerCreatedResponseDTO> {
    const customer = await this.service.create({
      name: dto.name,
      document: dto.document,
      documentType: dto.document_type,
      sectorId: dto.sector_id,
      email: dto.email,
      ownerName: dto.owner_name,
      ownerEmail: dto.owner_email,
      ownerPhone: dto.owner_phone,
      address: {
        type: dto.address.type,
        street: dto.address.street,
        number: dto.address.number,
        city: dto.address.city,
        state: dto.address.state,
        postalCode: dto.address.postal_code,
        countryCode: dto.address.country_code,
      },
    });

    return toCustomerCreatedResponse(customer);
  }
}
