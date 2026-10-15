import { ApiProperty } from '@nestjs/swagger';
import { LicenseConditionWithRisk } from '../../application/list-license-conditions-by-customer.use-case';
import { LicenseConditionRiskLevel } from '../../domain/license-condition-risk-level';
import { LicenseConditionStatusDto } from './add-license-condition.dto';
import { toLicenseConditionCreatedResponse } from './license-condition-created-response.dto';

export class LicenseConditionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  license_id!: string;

  @ApiProperty({ example: 'Automonitoramento Atmosférico' })
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ example: 'Emissões atmosféricas' })
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

  @ApiProperty({ enum: LicenseConditionRiskLevel, example: 'RISK' })
  risk_level!: LicenseConditionRiskLevel;
}

export function toLicenseConditionResponse(
  condition: LicenseConditionWithRisk,
): LicenseConditionResponseDto {
  const created = toLicenseConditionCreatedResponse(condition);

  return {
    id: created.id,
    license_id: created.license_id,
    name: created.name,
    description: created.description,
    environmental_descriptor: created.environmental_descriptor,
    responsible_agency: created.responsible_agency,
    due_date: created.due_date,
    status: created.status,
    has_delivery: created.has_delivery,
    is_violated: created.is_violated,
    risk_level: condition.riskLevel,
  };
}
