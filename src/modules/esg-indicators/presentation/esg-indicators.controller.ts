import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { AUTH_MESSAGES } from '../../auth/presentation/messages/auth.messages.pt-br';
import { GetEsgIndicatorsSummaryUseCase } from '../application/get-esg-indicators-summary.use-case';
import { GetEsgIndicatorsUseCase } from '../application/get-esg-indicators.use-case';
import { SaveEsgIndicatorsUseCase } from '../application/save-esg-indicators.use-case';
import {
  MonthlyIndicatorResponseDto,
  toIndicatorRecordChanges,
  toMonthlyIndicatorResponse,
} from './dto/esg-indicators-response.dto';
import {
  EsgIndicatorsSummaryResponseDto,
  toEsgIndicatorsSummaryResponse,
} from './dto/esg-indicators-summary-response.dto';
import { SaveEsgIndicatorsDto } from './dto/save-esg-indicators.dto';
import { EsgIndicatorsExceptionFilter } from './filters/esg-indicators-exception.filter';

export function invalidCustomerIdException(): BadRequestException {
  return new BadRequestException(AUTH_MESSAGES.INVALID_REQUEST);
}

const uuidPipe = new ParseUUIDPipe({
  exceptionFactory: invalidCustomerIdException,
});

@ApiTags('esg-indicators')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseFilters(EsgIndicatorsExceptionFilter)
@Controller('customers/:customerId/esg-indicators')
export class EsgIndicatorsController {
  constructor(
    private readonly getEsgIndicatorsUseCase: GetEsgIndicatorsUseCase,
    private readonly saveEsgIndicatorsUseCase: SaveEsgIndicatorsUseCase,
    private readonly getEsgIndicatorsSummaryUseCase: GetEsgIndicatorsSummaryUseCase,
  ) {}

  // Declared before ':month' so "summary" is not read as a month.
  @Get('summary')
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @ApiQuery({
    name: 'month',
    required: false,
    example: '2026-09',
    description:
      'Formato AAAA-MM. Sem ele, usa o mês mais recente que tiver registro.',
  })
  @ApiOperation({
    summary:
      'Resumo dos indicadores da empresa no mês, com a variação % em relação ao mês anterior.',
  })
  @ApiOkResponse({ type: EsgIndicatorsSummaryResponseDto })
  @ApiBadRequestResponse({
    description: 'Mês ou empresa com formato inválido.',
  })
  @ApiNotFoundResponse({ description: 'Empresa não encontrada.' })
  async getSummary(
    @Param('customerId', uuidPipe) customerId: string,
    @CurrentUser() user: { id: string },
    @Query('month') month?: string,
  ): Promise<EsgIndicatorsSummaryResponseDto> {
    const summary = await this.getEsgIndicatorsSummaryUseCase.execute(
      customerId,
      user.id,
      month,
    );

    return toEsgIndicatorsSummaryResponse(summary);
  }

  @Get(':month')
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @ApiParam({
    name: 'month',
    example: '2026-09',
    description: 'Formato AAAA-MM.',
  })
  @ApiOperation({
    summary:
      'Lista os indicadores configurados para a empresa com o valor do mês (null quando não há lançamento).',
  })
  @ApiOkResponse({ type: MonthlyIndicatorResponseDto, isArray: true })
  @ApiBadRequestResponse({
    description: 'Mês ou empresa com formato inválido.',
  })
  @ApiNotFoundResponse({ description: 'Empresa não encontrada.' })
  async getIndicators(
    @Param('customerId', uuidPipe) customerId: string,
    @Param('month') month: string,
    @CurrentUser() user: { id: string },
  ): Promise<MonthlyIndicatorResponseDto[]> {
    const indicators = await this.getEsgIndicatorsUseCase.execute(
      customerId,
      user.id,
      month,
    );

    return indicators.map(toMonthlyIndicatorResponse);
  }

  @Put(':month')
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @ApiParam({
    name: 'month',
    example: '2026-09',
    description: 'Formato AAAA-MM.',
  })
  @ApiOperation({
    summary:
      'Cadastra ou corrige os indicadores ESG do mês numa única transação.',
    description:
      'Indicador omitido não é alterado; número cria ou corrige o registro; null remove o registro. Devolve a lista completa do mês, como o GET.',
  })
  @ApiOkResponse({ type: MonthlyIndicatorResponseDto, isArray: true })
  @ApiBadRequestResponse({
    description:
      'Valor negativo, indicador não configurado ou repetido, formato inválido ou mês inválido.',
  })
  @ApiNotFoundResponse({ description: 'Empresa não encontrada.' })
  async saveIndicators(
    @Param('customerId', uuidPipe) customerId: string,
    @Param('month') month: string,
    @Body() dto: SaveEsgIndicatorsDto,
    @CurrentUser() user: { id: string },
  ): Promise<MonthlyIndicatorResponseDto[]> {
    const indicators = await this.saveEsgIndicatorsUseCase.execute({
      customerId,
      ownerUserId: user.id,
      month,
      records: toIndicatorRecordChanges(dto),
    });

    return indicators.map(toMonthlyIndicatorResponse);
  }
}
