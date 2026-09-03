import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import { CreateCustomEsgMetricUseCase } from '../../application/use-cases/create-custom-esg-metric.use-case';
import { CreateCustomEsgMetricDto } from '../dtos/create-custom-esg-metric.dto';
import {
  EsgMetricResponseDto,
  toEsgMetricResponse,
} from '../dtos/esg-metric-response.dto';

@ApiTags('esg-metrics')
@ApiBearerAuth()
@Controller('api/esg-metrics')
export class EsgMetricsController {
  constructor(
    private readonly createCustomEsgMetricUseCase: CreateCustomEsgMetricUseCase,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Cria uma métrica ESG customizada.',
    description: 'Métrica ESG customizada criada com sucesso.',
  })
  @ApiCreatedResponse({ type: EsgMetricResponseDto })
  async create(
    @Body() dto: CreateCustomEsgMetricDto,
    @CurrentUser() user: { id: string },
  ): Promise<EsgMetricResponseDto> {
    const metric = await this.createCustomEsgMetricUseCase.execute({
      name: dto.name,
      unit: dto.unit,
      pillar: dto.pillar,
      griStandardId: dto.gri_standard_id,
      clientId: user.id,
    });

    return toEsgMetricResponse(metric);
  }
}
