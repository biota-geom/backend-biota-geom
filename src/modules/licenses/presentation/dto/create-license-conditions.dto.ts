import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  Allow,
  ArrayMinSize,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

function emptyStringToNull({ value }: { value: unknown }): unknown {
  return value === '' ? null : value;
}

export class ConditionDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  parent_condition_id?: string | null;

  // Legacy clients may still send this value; numbering is computed on read.
  @Allow()
  item_number?: unknown;

  // Legacy compliance-target fields remain whitelisted and are ignored.
  @Allow()
  target_metric_id?: unknown;

  @Allow()
  target_operator?: unknown;

  @Allow()
  target_value?: unknown;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsIn(['PERIODIC', 'INFORMATIVE'])
  condition_type: string;

  @Transform(emptyStringToNull)
  @IsOptional()
  @IsString()
  @IsIn(['MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL'])
  periodicity?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    format: 'date-time',
    description:
      'Obrigatório para condicionantes periódicas com entrega; opcional para condicionantes informativas ou sem entrega.',
  })
  @Transform(emptyStringToNull)
  @ValidateIf(
    (dto: ConditionDto) =>
      (dto.condition_type !== 'INFORMATIVE' && dto.has_delivery !== false) ||
      (dto.deadline !== undefined && dto.deadline !== null),
  )
  @IsDateString()
  deadline?: string | null;

  @Transform(emptyStringToNull)
  @IsOptional()
  @IsDateString()
  alert_date?: string | null;

  @IsString()
  @IsNotEmpty()
  responsible_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  environmental_descriptor: string;

  @IsOptional()
  @IsBoolean()
  has_delivery?: boolean;
}

export class CreateLicenseConditionsDto {
  @ValidateNested({ each: true })
  @Type(() => ConditionDto)
  @ArrayMinSize(1)
  conditions: ConditionDto[];
}
