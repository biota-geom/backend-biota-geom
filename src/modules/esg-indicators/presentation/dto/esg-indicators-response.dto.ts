import { ApiProperty } from '@nestjs/swagger';
import {
  type IndicatorCategory,
  IndicatorDefinition,
  IndicatorRecordChange,
  INDICATOR_CATEGORIES,
  MonthlyIndicator,
} from '../../domain/esg-indicator';
import { SaveEsgIndicatorsDto } from './save-esg-indicators.dto';

export class MonthlyIndicatorResponseDto {
  @ApiProperty({ format: 'uuid' })
  indicator_id!: string;

  @ApiProperty({ example: 'Consumo de Água' })
  name!: string;

  @ApiProperty({ example: 'm³' })
  unit!: string;

  @ApiProperty({ enum: INDICATOR_CATEGORIES, example: 'Ambiental' })
  category!: IndicatorCategory;

  @ApiProperty({ type: Number, nullable: true, example: 1250.5 })
  value!: number | null;
}

export function toMonthlyIndicatorResponse(
  indicator: MonthlyIndicator,
): MonthlyIndicatorResponseDto {
  return {
    indicator_id: indicator.id,
    name: indicator.name,
    unit: indicator.unit,
    category: indicator.category,
    value: indicator.value,
  };
}

// A freshly created indicator has no value yet: same shape as the list items.
export function toNewIndicatorResponse(
  indicator: IndicatorDefinition,
): MonthlyIndicatorResponseDto {
  return toMonthlyIndicatorResponse({ ...indicator, value: null });
}

export function toIndicatorRecordChanges(
  dto: SaveEsgIndicatorsDto,
): IndicatorRecordChange[] {
  return dto.records.map((record) => ({
    indicatorId: record.indicator_id,
    value: record.value,
  }));
}
