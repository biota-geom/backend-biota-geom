import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export enum CreateCustomEsgMetricPillar {
  AMBIENTAL = 'ambiental',
  SOCIAL = 'social',
  GOVERNANCA = 'governanca',
}

export class CreateCustomEsgMetricDto {
  @ApiProperty({
    example: 'Efluentes Químicos Específicos',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    example: 'm³',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit!: string;

  @ApiProperty({
    enum: CreateCustomEsgMetricPillar,
    example: CreateCustomEsgMetricPillar.AMBIENTAL,
  })
  @IsEnum(CreateCustomEsgMetricPillar)
  pillar!: CreateCustomEsgMetricPillar;

  @ApiPropertyOptional({
    example: 'gri-standard-id',
  })
  @IsOptional()
  @IsUUID()
  griStandardId?: string;
}
