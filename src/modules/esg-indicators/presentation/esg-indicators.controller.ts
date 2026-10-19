import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
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
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { AUTH_MESSAGES } from '../../auth/presentation/messages/auth.messages.pt-br';
import { GetEsgIndicatorsUseCase } from '../application/get-esg-indicators.use-case';
import { SaveEsgIndicatorsUseCase } from '../application/save-esg-indicators.use-case';
import {
  EsgIndicatorsResponseDto,
  toEsgIndicatorChanges,
  toEsgIndicatorsResponse,
} from './dto/esg-indicators-response.dto';
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
  ) {}

  @Get(':month')
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @ApiParam({
    name: 'month',
    example: '2026-09',
    description: 'Formato AAAA-MM.',
  })
  @ApiOperation({
    summary:
      'Retorna os indicadores ESG do mês; indicadores sem registro vêm como null.',
  })
  @ApiOkResponse({ type: EsgIndicatorsResponseDto })
  @ApiBadRequestResponse({
    description: 'Mês ou empresa com formato inválido.',
  })
  @ApiNotFoundResponse({ description: 'Empresa não encontrada.' })
  async getIndicators(
    @Param('customerId', uuidPipe) customerId: string,
    @Param('month') month: string,
    @CurrentUser() user: { id: string },
  ): Promise<EsgIndicatorsResponseDto> {
    const values = await this.getEsgIndicatorsUseCase.execute(
      customerId,
      user.id,
      month,
    );

    return toEsgIndicatorsResponse(values);
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
      'Campo omitido não é alterado; número cria ou corrige o registro; null remove o registro.',
  })
  @ApiOkResponse({ type: EsgIndicatorsResponseDto })
  @ApiBadRequestResponse({
    description: 'Valor negativo, fora do formato ou mês inválido.',
  })
  @ApiNotFoundResponse({ description: 'Empresa não encontrada.' })
  async saveIndicators(
    @Param('customerId', uuidPipe) customerId: string,
    @Param('month') month: string,
    @Body() dto: SaveEsgIndicatorsDto,
    @CurrentUser() user: { id: string },
  ): Promise<EsgIndicatorsResponseDto> {
    const values = await this.saveEsgIndicatorsUseCase.execute({
      customerId,
      ownerUserId: user.id,
      month,
      changes: toEsgIndicatorChanges(dto),
    });

    return toEsgIndicatorsResponse(values);
  }
}
