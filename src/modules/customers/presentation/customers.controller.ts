import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { CustomersService } from '../infra/customers.service';
import { CustomerResponseDTO } from './dto/customer-responde.dto';

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
  @ApiOkResponse({ type: CustomerResponseDTO, isArray: true })
  async listCustomers(): Promise<CustomerResponseDTO[]> {
    return this.service.findAll();
  }
}
