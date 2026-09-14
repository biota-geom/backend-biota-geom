import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseFilters,
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
import { AUTH_MESSAGES } from '../../auth/presentation/messages/auth.messages.pt-br';
import {
  EsgMetricResponseDto,
  toEsgMetricResponse,
} from '../../esg-metrics/presentation/dtos/esg-metric-response.dto';
import { LinkCustomerEsgMetricsUseCase } from '../application/link-customer-esg-metrics.use-case';
import { ListCustomerEsgMetricsUseCase } from '../application/list-customer-esg-metrics.use-case';
import { CustomersService } from '../infra/customers.service';
import { CustomerResponseDTO } from './dto/customer-responde.dto';
import { LinkCustomerEsgMetricsDto } from './dto/link-customer-esg-metrics.dto';
import { CustomersExceptionFilter } from './filters/customers-exception.filter';

export function invalidCustomerIdException(): BadRequestException {
  return new BadRequestException(AUTH_MESSAGES.INVALID_REQUEST);
}

const uuidPipe = new ParseUUIDPipe({
  exceptionFactory: invalidCustomerIdException,
});

@ApiTags('customers')
@UseFilters(CustomersExceptionFilter)
@Controller('customers')
export class CustomerController {
  constructor(
    private readonly service: CustomersService,
    private readonly linkCustomerEsgMetricsUseCase: LinkCustomerEsgMetricsUseCase,
    private readonly listCustomerEsgMetricsUseCase: ListCustomerEsgMetricsUseCase,
  ) {}

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

  /*
   * Intended public prefix is /api/customers (same as /api/esg-metrics).
   * Keep the current /customers base path until the frontend migrates;
   * new routes follow the controller as it is today.
   */
  @Get(':id/esg-metrics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List ESG metrics monitored by a customer.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: EsgMetricResponseDto, isArray: true })
  async listCustomerEsgMetrics(
    @Param('id', uuidPipe) customerId: string,
  ): Promise<EsgMetricResponseDto[]> {
    const metrics =
      await this.listCustomerEsgMetricsUseCase.execute(customerId);

    return metrics.map(toEsgMetricResponse);
  }

  @Post(':id/esg-metrics')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Replace the ESG metrics monitored by a customer.',
    description:
      'Clears previous links and inserts metric_ids. An empty array unlinks all metrics.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({
    description: 'Customer ESG metric links were replaced.',
  })
  async linkCustomerEsgMetrics(
    @Param('id', uuidPipe) customerId: string,
    @Body() dto: LinkCustomerEsgMetricsDto,
  ): Promise<void> {
    await this.linkCustomerEsgMetricsUseCase.execute(
      customerId,
      dto.metric_ids,
    );
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
