import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EsgMetricEntity,
  type EsgPillar,
} from '../../domain/entities/esg-metric.entity';
import { CreateCustomEsgMetricPillar } from './create-custom-esg-metric.dto';

export class EsgMetricResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Efluentes Químicos Específicos' })
  name!: string;

  @ApiProperty({ example: 'm³' })
  unit!: string;

  @ApiProperty({
    enum: CreateCustomEsgMetricPillar,
    example: CreateCustomEsgMetricPillar.AMBIENTAL,
  })
  pillar!: EsgPillar;

  @ApiPropertyOptional({ nullable: true })
  client_id!: string | null;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  gri_standard_id!: string | null;
}

export function toEsgMetricResponse(
  metric: EsgMetricEntity,
): EsgMetricResponseDto {
  return {
    id: metric.id,
    name: metric.name,
    unit: metric.unit,
    pillar: metric.pillar,
    client_id: metric.clientId,
    gri_standard_id: metric.griStandardId,
  };
}
