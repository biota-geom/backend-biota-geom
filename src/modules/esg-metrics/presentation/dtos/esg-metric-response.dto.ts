import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EsgMetricEntity } from '../../domain/entities/esg-metric.entity';
import { EsgPillar } from '../../domain/esg-pillar';

export class EsgMetricResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Efluentes Químicos Específicos' })
  name!: string;

  @ApiProperty({ example: 'm³' })
  unit!: string;

  @ApiProperty({
    enum: EsgPillar,
    example: EsgPillar.AMBIENTAL,
  })
  pillar!: EsgPillar;

  @ApiPropertyOptional({ nullable: true })
  customer_id!: string | null;

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
    customer_id: metric.customerId,
    gri_standard_id: metric.griStandardId,
  };
}
