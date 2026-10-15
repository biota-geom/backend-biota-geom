import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ConditionPeriodicity,
  ConditionStatus,
  ConditionType,
} from '@prisma/client';
import {
  Allow,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const CONDITION_STATUS_INPUTS = [
  ...Object.values(ConditionStatus),
  'Atendida',
  'Em atendimento',
  'Em andamento',
  'Atrasada',
];
const CONDITION_TYPE_INPUTS = [
  ...Object.values(ConditionType),
  'Informativo',
  'Periódico',
];
const CONDITION_PERIODICITY_INPUTS = [
  ...Object.values(ConditionPeriodicity),
  'NA',
];

export class UpdateLicenseConditionDto {
  // Legacy clients may still send this value; numbering is computed on read.
  @Allow()
  item_number?: unknown;

  @ApiPropertyOptional({ maxLength: 160 })
  @ValidateIf((dto: UpdateLicenseConditionDto) => dto.name !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({ maxLength: 160 })
  @ValidateIf((dto: UpdateLicenseConditionDto) => dto.title !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @ValidateIf(
    (dto: UpdateLicenseConditionDto) =>
      dto.environmental_descriptor !== undefined,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  environmental_descriptor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Lucas Silva' })
  @IsOptional()
  @IsString()
  responsible_name?: string;

  @ApiPropertyOptional({ example: 'FEPAM' })
  @IsOptional()
  @IsString()
  responsible_agency?: string;

  @ApiPropertyOptional({ enum: CONDITION_TYPE_INPUTS })
  @IsOptional()
  @IsIn(CONDITION_TYPE_INPUTS)
  condition_type?: ConditionType | 'Informativo' | 'Periódico';

  @ApiPropertyOptional({ enum: CONDITION_PERIODICITY_INPUTS, nullable: true })
  @IsOptional()
  @IsIn(CONDITION_PERIODICITY_INPUTS)
  periodicity?: ConditionPeriodicity | 'NA' | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @IsOptional()
  @IsDateString()
  deadline?: string | null;

  @ApiPropertyOptional({ format: 'date-time' })
  @ValidateIf((dto: UpdateLicenseConditionDto) => dto.due_date !== undefined)
  @IsDateString()
  due_date?: string;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @IsOptional()
  @IsDateString()
  alert_date?: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @IsOptional()
  @IsDateString()
  completion_date?: string | null;

  @ApiPropertyOptional({ enum: CONDITION_STATUS_INPUTS })
  @IsOptional()
  @IsIn(CONDITION_STATUS_INPUTS)
  status?:
    | ConditionStatus
    | 'Atendida'
    | 'Em atendimento'
    | 'Em andamento'
    | 'Atrasada';

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  has_delivery?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  is_violated?: boolean;

  @Allow()
  target_metric_id?: unknown;

  @Allow()
  target_operator?: unknown;

  @Allow()
  target_value?: unknown;
}
