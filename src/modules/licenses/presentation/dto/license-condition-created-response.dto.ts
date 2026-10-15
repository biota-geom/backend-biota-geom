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
  name!: string;

  @ApiProperty({ example: 'Resíduos sólidos' })
  environmental_descriptor!: string;

  @ApiProperty({ example: 'FEPAM', nullable: true })
  responsible_agency!: string | null;

  @ApiProperty({ format: 'date-time' })
  due_date!: string;

  @ApiProperty({ enum: LicenseConditionStatusDto })
  status!: LicenseConditionStatusDto;

  @ApiProperty({ type: Boolean })
  has_delivery!: boolean;

  @ApiProperty({ type: Boolean })
  is_violated!: boolean;

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
    environmental_descriptor: condition.environmentalDescriptor,
    responsible_agency: condition.responsibleAgency,
    due_date: condition.dueDate.toISOString(),
    status: STATUS_LABELS[condition.status],
    has_delivery: condition.hasDelivery,
    is_violated: condition.isViolated,
    description: condition.description,
    created_at: condition.createdAt.toISOString(),
  };
}
