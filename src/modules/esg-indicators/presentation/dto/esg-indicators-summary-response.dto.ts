import { ApiProperty } from '@nestjs/swagger';
import {
  type IndicatorCategory,
  INDICATOR_CATEGORIES,
} from '../../domain/esg-indicator';
import {
  EsgIndicatorsSummary,
  IndicatorSummary,
} from '../../domain/esg-indicator-summary';

export class IndicatorSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  indicator_id!: string;

  @ApiProperty({ example: 'Consumo de Água' })
  name!: string;

  @ApiProperty({ example: 'm³' })
  unit!: string;

  @ApiProperty({ enum: INDICATOR_CATEGORIES, example: 'Ambiental' })
  category!: IndicatorCategory;

  @ApiProperty({ type: Number, nullable: true, example: 1100 })
  current!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 1000 })
  previous!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 10.0,
    description:
      'Variação % em relação ao mês anterior, com 1 casa decimal; null sem valor anterior ou com anterior igual a 0.',
  })
  variation_pct!: number | null;
}

export class EsgIndicatorsSummaryResponseDto {
  @ApiProperty({
    type: String,
    nullable: true,
    example: '2026-09',
    description: 'Mês do resumo; null quando a empresa ainda não tem registro.',
  })
  reference_month!: string | null;

  @ApiProperty({ type: IndicatorSummaryResponseDto, isArray: true })
  indicators!: IndicatorSummaryResponseDto[];
}

function toIndicatorSummaryResponse(
  indicator: IndicatorSummary,
): IndicatorSummaryResponseDto {
  return {
    indicator_id: indicator.id,
    name: indicator.name,
    unit: indicator.unit,
    category: indicator.category,
    current: indicator.current,
    previous: indicator.previous,
    variation_pct: indicator.variationPct,
  };
}

export function toEsgIndicatorsSummaryResponse(
  summary: EsgIndicatorsSummary,
): EsgIndicatorsSummaryResponseDto {
  return {
    reference_month: summary.referenceMonth,
    indicators: summary.indicators.map(toIndicatorSummaryResponse),
  };
}
