import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import {
  ESG_METRIC_NAME_MAX_LENGTH,
  ESG_METRIC_UNIT_MAX_LENGTH,
} from '../../../esg-metrics/domain/esg-pillar';
import {
  INDICATOR_CATEGORIES,
  type IndicatorCategory,
} from '../../domain/esg-indicator';
import { ESG_INDICATORS_MESSAGES } from '../messages/esg-indicators.messages.pt-br';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateCustomerIndicatorDto {
  @ApiProperty({ example: 'Consumo de Combustível' })
  @Transform(trimString)
  @IsString({ message: ESG_INDICATORS_MESSAGES.INDICATOR_NAME_REQUIRED })
  @IsNotEmpty({ message: ESG_INDICATORS_MESSAGES.INDICATOR_NAME_REQUIRED })
  @MaxLength(ESG_METRIC_NAME_MAX_LENGTH, {
    message: ESG_INDICATORS_MESSAGES.INDICATOR_NAME_TOO_LONG,
  })
  name!: string;

  @ApiProperty({ example: 'L' })
  @Transform(trimString)
  @IsString({ message: ESG_INDICATORS_MESSAGES.INDICATOR_UNIT_REQUIRED })
  @IsNotEmpty({ message: ESG_INDICATORS_MESSAGES.INDICATOR_UNIT_REQUIRED })
  @MaxLength(ESG_METRIC_UNIT_MAX_LENGTH, {
    message: ESG_INDICATORS_MESSAGES.INDICATOR_UNIT_TOO_LONG,
  })
  unit!: string;

  @ApiProperty({ enum: INDICATOR_CATEGORIES, example: 'Ambiental' })
  @IsIn(INDICATOR_CATEGORIES, {
    message: ESG_INDICATORS_MESSAGES.INDICATOR_CATEGORY_INVALID,
  })
  category!: IndicatorCategory;
}
