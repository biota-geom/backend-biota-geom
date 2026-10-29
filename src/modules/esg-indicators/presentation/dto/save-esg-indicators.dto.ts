import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsUUID,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ESG_INDICATORS_MESSAGES } from '../messages/esg-indicators.messages.pt-br';

// Largest value that fits the NUMERIC(18,4) column.
export const MAX_INDICATOR_VALUE = 99_999_999_999_999;

// Upper bound for one request; a customer never reports this many indicators.
export const MAX_RECORDS_PER_REQUEST = 200;

export class IndicatorRecordDto {
  @ApiProperty({
    format: 'uuid',
    example: '0197a1c2-7c1e-7a43-9b0e-2f6d4c1b8a10',
  })
  @IsUUID(undefined, { message: ESG_INDICATORS_MESSAGES.INDICATOR_ID_INVALID })
  indicator_id!: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    minimum: 0,
    example: 1250.5,
    description: 'Valor medido. null remove o registro do mês.',
  })
  // null is allowed (it clears the record); undefined still fails IsNumber.
  @ValidateIf((_, value: unknown) => value !== null)
  @IsNumber(
    { allowNaN: false, allowInfinity: false, maxDecimalPlaces: 4 },
    { message: ESG_INDICATORS_MESSAGES.VALUE_MUST_BE_NUMBER },
  )
  @Min(0, { message: ESG_INDICATORS_MESSAGES.VALUE_MUST_NOT_BE_NEGATIVE })
  @Max(MAX_INDICATOR_VALUE, {
    message: ESG_INDICATORS_MESSAGES.VALUE_TOO_LARGE,
  })
  value!: number | null;
}

export class SaveEsgIndicatorsDto {
  @ApiProperty({ type: [IndicatorRecordDto] })
  @IsArray({ message: ESG_INDICATORS_MESSAGES.RECORDS_MUST_BE_LIST })
  @ArrayMaxSize(MAX_RECORDS_PER_REQUEST, {
    message: ESG_INDICATORS_MESSAGES.TOO_MANY_RECORDS,
  })
  @ValidateNested({ each: true })
  @Type(() => IndicatorRecordDto)
  records!: IndicatorRecordDto[];
}
