import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ConditionPeriodicity,
  ConditionStatus,
  ConditionType,
} from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
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
  @ApiPropertyOptional({ example: '1.1' })
  @IsOptional()
  @IsString()
  item_number?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  title?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Lucas Silva' })
  @IsOptional()
  @IsString()
  responsible_name?: string;

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

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @IsOptional()
  @IsDateString()
  due_date?: string | null;

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
  is_violated?: boolean;
}
