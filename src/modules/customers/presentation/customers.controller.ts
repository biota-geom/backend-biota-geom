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
  Put,
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
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { AUTH_MESSAGES } from '../../auth/presentation/messages/auth.messages.pt-br';
import {
  EsgMetricResponseDto,
  toEsgMetricResponse,
} from '../../esg-metrics/presentation/dtos/esg-metric-response.dto';
import { LinkCustomerEsgMetricsUseCase } from '../application/link-customer-esg-metrics.use-case';
import { ListCustomerEsgMetricsUseCase } from '../application/list-customer-esg-metrics.use-case';
import { CustomersService } from '../infra/customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import {
  CustomerCreatedResponseDTO,
  toCustomerCreatedResponse,
} from './dto/customer-created-response.dto';
import { CustomerDetailResponseDto } from './dto/customer-detail-response.dto';
import { CustomerListResponseDTO } from './dto/customer-list-response.dto';
import { CustomerResponseDTO } from './dto/customer-response.dto';
import { LinkCustomerEsgMetricsDto } from './dto/link-customer-esg-metrics.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersExceptionFilter } from './filters/customers-exception.filter';

export function invalidCustomerIdException(): BadRequestException {
  return new BadRequestException(AUTH_MESSAGES.INVALID_REQUEST);
}

const uuidPipe = new ParseUUIDPipe({
  exceptionFactory: invalidCustomerIdException,
});

/*
 * Every route here is scoped to the authenticated owner (US01/US03/US10).
 * The owner always comes from the JWT via @CurrentUser — never from a path,
 * query or body parameter, which a client could point at another account.
 * `is_admin` grants nothing extra: isolation applies to every account.
 */
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
    summary: 'List the companies owned by the authenticated user.',
  })
  @ApiOkResponse({ type: CustomerListResponseDTO, isArray: true })
  async listCustomers(
    @CurrentUser() user: { id: string },
  ): Promise<CustomerListResponseDTO[]> {
    return this.service.findAll(user.id);
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
    @CurrentUser() user: { id: string },
  ): Promise<CustomerCreatedResponseDTO> {
    const customer = await this.service.create({
      // Owner taken from the token. CreateCustomerDto has no owner field, so
      // a payload cannot register a company for somebody else.
      ownerUserId: user.id,
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
    summary: 'Find a company owned by the authenticated user, by id.',
  })
  @ApiOkResponse({ type: CustomerResponseDTO })
  /*
   * A customer that belongs to another owner answers 404, not 403: the two
   * cases are deliberately indistinguishable. A 403 would confirm the id
   * exists, which is all an attacker needs to enumerate other tenants' ids.
   * Same reasoning as the auth module's uniform login/registration errors.
   */
  @ApiNotFoundResponse({
    description: 'Customer not found: unknown id, or owned by another client.',
  })
  async getCustomer(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ): Promise<CustomerResponseDTO> {
    return this.service.findOne(id, user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Atualiza os dados cadastrais de uma empresa e seu endereço.',
  })
  @ApiOkResponse({ type: CustomerDetailResponseDto })
  @ApiNotFoundResponse({
    description: 'Customer not found: unknown id, or owned by another client.',
  })
  async updateCustomer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: { id: string },
  ): Promise<CustomerDetailResponseDto> {
    return this.service.update(id, user.id, dto);
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
    @CurrentUser() user: { id: string },
  ): Promise<EsgMetricResponseDto[]> {
    const metrics = await this.listCustomerEsgMetricsUseCase.execute(
      customerId,
      user.id,
    );

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
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    await this.linkCustomerEsgMetricsUseCase.execute(
      customerId,
      user.id,
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
  @ApiNotFoundResponse({
    description: 'Customer not found: unknown id, or owned by another client.',
  })
  async deleteCustomer(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    await this.service.remove(id, user.id);
  }
}
