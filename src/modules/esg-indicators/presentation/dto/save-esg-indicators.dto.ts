import { applyDecorators } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ESG_INDICATORS_MESSAGES } from '../messages/esg-indicators.messages.pt-br';

// Largest value that fits the NUMERIC(18,4) column.
export const MAX_INDICATOR_VALUE = 99_999_999_999_999;

/*
 * Every field is optional so a month can be saved with only part of the
 * indicators filled in. null clears an indicator that was saved before.
 */
function IndicatorValue(example: number, description: string) {
  return applyDecorators(
    ApiPropertyOptional({
      type: Number,
      nullable: true,
      minimum: 0,
      example,
      description,
    }),
    IsOptional(),
    IsNumber(
      { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 4 },
      { message: ESG_INDICATORS_MESSAGES.VALUE_MUST_BE_NUMBER },
    ),
    Min(0, { message: ESG_INDICATORS_MESSAGES.VALUE_MUST_NOT_BE_NEGATIVE }),
    Max(MAX_INDICATOR_VALUE, {
      message: ESG_INDICATORS_MESSAGES.VALUE_TOO_LARGE,
    }),
  );
}

export class SaveEsgIndicatorsDto {
  @IndicatorValue(1250.5, 'Consumo de água (m³).')
  water?: number | null;

  @IndicatorValue(12.3, 'Resíduos gerados (t).')
  waste?: number | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 0,
    example: 148,
    description: 'Número de funcionários (inteiro).',
  })
  @IsOptional()
  @IsInt({ message: ESG_INDICATORS_MESSAGES.EMPLOYEES_MUST_BE_INTEGER })
  @Min(0, { message: ESG_INDICATORS_MESSAGES.VALUE_MUST_NOT_BE_NEGATIVE })
  @Max(MAX_INDICATOR_VALUE, {
    message: ESG_INDICATORS_MESSAGES.VALUE_TOO_LARGE,
  })
  employees?: number | null;

  @IndicatorValue(53200, 'Consumo de energia (kWh).')
  energy?: number | null;
}
