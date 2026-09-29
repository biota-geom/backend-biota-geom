import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LicenseConditionStatus } from '@prisma/client';
import { LicenseCondition } from '../../domain/license-condition.entity';
import { LicenseConditionStatusDto } from './add-license-condition.dto';

const STATUS_LABELS: Record<LicenseConditionStatus, LicenseConditionStatusDto> =
  {
    [LicenseConditionStatus.REGULAR]: LicenseConditionStatusDto.REGULAR,
    [LicenseConditionStatus.ATTENTION]: LicenseConditionStatusDto.ATTENTION,
    [LicenseConditionStatus.RISK]: LicenseConditionStatusDto.RISK,
  };

export class LicenseConditionCreatedResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  license_id!: string;

  @ApiProperty({ example: 'MTR - Manifesto de Transporte de Resíduos' })
  name!: string | null;

  @ApiProperty({ example: 'Resíduos' })
  category!: string | null;

  @ApiProperty({ example: 'FEPAM', nullable: true })
  responsible_agency!: string | null;

  @ApiProperty({ format: 'date-time' })
  due_date!: string | null;

  @ApiProperty({ enum: LicenseConditionStatusDto })
  status!: LicenseConditionStatusDto;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

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
    category: condition.category,
    responsible_agency: condition.responsibleAgency,
    due_date: condition.dueDate?.toISOString() ?? null,
    status: STATUS_LABELS[condition.status],
    description: condition.description,
    created_at: condition.createdAt.toISOString(),
  };
}
