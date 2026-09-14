import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { CustomersService } from '../infra/customers.service';
import { CustomerListResponseDTO } from './dto/customer-list-response.dto';
import { CustomerResponseDTO } from './dto/customer-response.dto';

@ApiTags('customers')
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
