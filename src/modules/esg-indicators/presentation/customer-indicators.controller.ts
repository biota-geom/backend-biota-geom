import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { CreateCustomerIndicatorUseCase } from '../application/create-customer-indicator.use-case';
import { CreateCustomerIndicatorDto } from './dto/create-customer-indicator.dto';
import {
  MonthlyIndicatorResponseDto,
  toNewIndicatorResponse,
} from './dto/esg-indicators-response.dto';
import { invalidCustomerIdException } from './esg-indicators.controller';
import { EsgIndicatorsExceptionFilter } from './filters/esg-indicators-exception.filter';

const uuidPipe = new ParseUUIDPipe({
  exceptionFactory: invalidCustomerIdException,
});

@ApiTags('esg-indicators')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseFilters(EsgIndicatorsExceptionFilter)
@Controller('customers/:customerId/indicators')
export class CustomerIndicatorsController {
  constructor(
    private readonly createCustomerIndicatorUseCase: CreateCustomerIndicatorUseCase,
  ) {}

  @Post()
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @ApiOperation({
    summary: 'Cria um indicador e o vincula à empresa.',
    description:
      'Usado no registro mensal quando a empresa passa a monitorar uma nova métrica. O indicador criado já pode receber valores no mês.',
  })
  @ApiCreatedResponse({ type: MonthlyIndicatorResponseDto })
  @ApiBadRequestResponse({
    description: 'Nome, unidade ou categoria inválidos.',
  })
  @ApiNotFoundResponse({ description: 'Empresa não encontrada.' })
  @ApiConflictResponse({
    description: 'A empresa já tem um indicador com este nome.',
  })
  async create(
    @Param('customerId', uuidPipe) customerId: string,
    @Body() dto: CreateCustomerIndicatorDto,
    @CurrentUser() user: { id: string },
  ): Promise<MonthlyIndicatorResponseDto> {
    const indicator = await this.createCustomerIndicatorUseCase.execute({
      customerId,
      ownerUserId: user.id,
      name: dto.name,
      unit: dto.unit,
      category: dto.category,
    });

    return toNewIndicatorResponse(indicator);
  }
}
