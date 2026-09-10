import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  ESG_METRIC_NAME_MAX_LENGTH,
  ESG_METRIC_UNIT_MAX_LENGTH,
  ESG_PILLAR_VALUES,
  EsgPillar,
} from '../../domain/esg-pillar';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateCustomEsgMetricDto {
  @ApiProperty({
    example: 'Efluentes Químicos Específicos',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(ESG_METRIC_NAME_MAX_LENGTH)
  name!: string;

  @ApiProperty({
    example: 'm³',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(ESG_METRIC_UNIT_MAX_LENGTH)
  unit!: string;

  @ApiProperty({
    enum: EsgPillar,
    example: EsgPillar.AMBIENTAL,
  })
  @IsIn(ESG_PILLAR_VALUES)
  pillar!: EsgPillar;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  gri_standard_id?: string;
}
