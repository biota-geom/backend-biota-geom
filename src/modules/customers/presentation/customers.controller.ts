import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
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
import { CustomerListResponseDTO } from './dto/customer-list-response.dto';
import { CustomerResponseDTO } from './dto/customer-response.dto';
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
  @ApiOkResponse({ type: CustomerListResponseDTO, isArray: true })
  async listCustomers(): Promise<CustomerListResponseDTO[]> {
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

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Find a customer by id',
  })
  @ApiOkResponse({ type: CustomerResponseDTO })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  async getCustomer(@Param('id') id: string): Promise<CustomerResponseDTO> {
    return this.service.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: 'id', description: 'Customer ID', type: 'string' })
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a customer',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Customer not found' })
  async deleteCustomer(@Param('id') id: string): Promise<void> {
    await this.service.remove(id);
  }
}
