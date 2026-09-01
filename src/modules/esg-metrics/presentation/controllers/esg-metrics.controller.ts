import { Controller } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateCustomEsgMetricUseCase } from '../../application/use-cases/create-custom-esg-metric.use-case';
import { CreateCustomEsgMetricDto } from '../dtos/create-custom-esg-metric.dto';

@ApiTags('esg-metrics')
@Controller('api/esg-metrics')
export class EsgMetricsController {
  constructor(
    private readonly createCustomEsgMetricUseCase: CreateCustomEsgMetricUseCase,
  ) {}

  @ApiOperation({
    summary: 'Cria uma métrica ESG customizada.',
    description: 'Métrica ESG customizada criada com sucesso.',
  })
  async create(dto: CreateCustomEsgMetricDto, user: { clientId: string }) {
    return this.createCustomEsgMetricUseCase.execute({
      name: dto.name,
      unit: dto.unit,
      pillar: dto.pillar,
      griStandardId: dto.griStandardId,
      clientId: user.clientId,
    });
  }
}
