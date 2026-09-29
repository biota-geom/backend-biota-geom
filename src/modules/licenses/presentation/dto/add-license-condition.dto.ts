import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LicenseConditionStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
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

  @ApiProperty({ example: 'Resíduos', maxLength: 120 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  category!: string;

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
  @IsDateString()
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
