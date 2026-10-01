import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  LicenseConditionStatus,
  LicenseConditionTargetOperator,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Validate,
} from 'class-validator';
import { IsFutureDateConstraint } from '../validators/is-future-date.validator';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export enum LicenseConditionStatusDto {
  REGULAR = 'Regular',
  ATTENTION = 'Atenção',
  RISK = 'Risco',
}

const STATUS_TO_DOMAIN: Record<
  LicenseConditionStatusDto,
  LicenseConditionStatus
> = {
  [LicenseConditionStatusDto.REGULAR]: LicenseConditionStatus.REGULAR,
  [LicenseConditionStatusDto.ATTENTION]: LicenseConditionStatus.ATTENTION,
  [LicenseConditionStatusDto.RISK]: LicenseConditionStatus.RISK,
};

export function toLicenseConditionStatus(
  status: LicenseConditionStatusDto | undefined,
): LicenseConditionStatus | undefined {
  return status === undefined ? undefined : STATUS_TO_DOMAIN[status];
}

export class AddLicenseConditionDto {
  @ApiProperty({
    example: 'MTR - Manifesto de Transporte de Resíduos',
    maxLength: 160,
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @ApiProperty({
    format: 'uuid',
    description:
      'Parâmetro GRI (US02) vinculado à empresa que define a categoria da condicionante.',
  })
  @IsUUID()
  esg_metric_id!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  license_id!: string;

  @ApiProperty({ example: 'FEPAM', maxLength: 150 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  responsible_agency!: string;

  @ApiProperty({ example: '2027-05-20T00:00:00.000Z', format: 'date-time' })
  @IsNotEmpty()
  @IsISO8601()
  @Validate(IsFutureDateConstraint)
  due_date!: string;

  @ApiPropertyOptional({
    enum: LicenseConditionStatusDto,
    default: LicenseConditionStatusDto.REGULAR,
  })
  @IsOptional()
  @IsEnum(LicenseConditionStatusDto)
  status?: LicenseConditionStatusDto;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Métrica ESG alvo da meta. Informar junto com target_operator e target_value.',
  })
  @IsOptional()
  @IsUUID()
  target_metric_id?: string;

  @ApiPropertyOptional({ enum: LicenseConditionTargetOperator, example: 'LTE' })
  @IsOptional()
  @IsEnum(LicenseConditionTargetOperator)
  target_operator?: LicenseConditionTargetOperator;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  target_value?: number;

  @ApiPropertyOptional({
    example:
      'Emissão de manifesto para movimentação e destinação final de resíduos industriais.',
    maxLength: 500,
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
