import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  LicenseConditionStatus,
  LicenseConditionTargetOperator,
} from '@prisma/client';
import { LicenseCondition } from '../../domain/license-condition.entity';
import { LicenseConditionStatusDto } from './add-license-condition.dto';

const STATUS_LABELS: Record<LicenseConditionStatus, LicenseConditionStatusDto> =
  {
    [LicenseConditionStatus.REGULAR]: LicenseConditionStatusDto.REGULAR,
    [LicenseConditionStatus.ATTENTION]: LicenseConditionStatusDto.ATTENTION,
    [LicenseConditionStatus.RISK]: LicenseConditionStatusDto.RISK,
  };

export class LicenseConditionCategoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Resíduos' })
  name!: string;
}

export class LicenseConditionCreatedResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  license_id!: string;

  @ApiProperty({ example: 'MTR - Manifesto de Transporte de Resíduos' })
  name!: string;

  @ApiProperty({ type: LicenseConditionCategoryResponseDto })
  category!: LicenseConditionCategoryResponseDto;

  @ApiProperty({ example: 'FEPAM', nullable: true })
  responsible_agency!: string | null;

  @ApiProperty({ format: 'date-time' })
  due_date!: string;

  @ApiProperty({ enum: LicenseConditionStatusDto })
  status!: LicenseConditionStatusDto;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  target_metric_id!: string | null;

  @ApiProperty({ enum: LicenseConditionTargetOperator, nullable: true })
  target_operator!: LicenseConditionTargetOperator | null;

  @ApiProperty({ example: 150, nullable: true })
  target_value!: number | null;

  @ApiProperty({ format: 'date-time' })
  created_at!: string;
}

export function toLicenseConditionCreatedResponse(
  condition: LicenseCondition,
): LicenseConditionCreatedResponseDto {
  return {
    id: condition.id,
    license_id: condition.licenseId,
    name: condition.name,
    category: { id: condition.category.id, name: condition.category.name },
    responsible_agency: condition.responsibleAgency,
    due_date: condition.dueDate.toISOString(),
    status: STATUS_LABELS[condition.status],
    description: condition.description,
    target_metric_id: condition.targetMetricId,
    target_operator: condition.targetOperator,
    target_value: condition.targetValue,
    created_at: condition.createdAt.toISOString(),
  };
}
