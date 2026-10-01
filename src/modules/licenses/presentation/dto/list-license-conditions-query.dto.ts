import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { LicenseConditionRiskLevel } from '../../domain/license-condition-risk-level';

export enum LicenseConditionStatusFilter {
  ALL = 'all',
  REGULAR = LicenseConditionRiskLevel.REGULAR,
  ATTENTION = LicenseConditionRiskLevel.ATTENTION,
  RISK = LicenseConditionRiskLevel.RISK,
}

export class ListLicenseConditionsQueryDto {
  @ApiPropertyOptional({ enum: LicenseConditionStatusFilter })
  @IsOptional()
  @IsEnum(LicenseConditionStatusFilter)
  status?: LicenseConditionStatusFilter;
}
