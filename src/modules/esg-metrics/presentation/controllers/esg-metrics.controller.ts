import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import { CreateCustomEsgMetricUseCase } from '../../application/use-cases/create-custom-esg-metric.use-case';
import { CreateCustomEsgMetricDto } from '../dtos/create-custom-esg-metric.dto';

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
  async create(
    @Body() dto: CreateCustomEsgMetricDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.createCustomEsgMetricUseCase.execute({
      name: dto.name,
      unit: dto.unit,
      pillar: dto.pillar,
      griStandardId: dto.griStandardId,
      clientId: user.id,
    });
  }
}
