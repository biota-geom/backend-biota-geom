import { ApiProperty } from '@nestjs/swagger';
import { LicenseConditionWithRisk } from '../../application/list-license-conditions-by-customer.use-case';
import { LicenseConditionRiskLevel } from '../../domain/license-condition-risk-level';
import { LicenseConditionStatusDto } from './add-license-condition.dto';
import {
  LicenseConditionCategoryResponseDto,
  toLicenseConditionCreatedResponse,
} from './license-condition-created-response.dto';

export class LicenseConditionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  license_id!: string;

  @ApiProperty({ example: 'Automonitoramento Atmosférico' })
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({
    type: LicenseConditionCategoryResponseDto,
    description:
      'Parâmetro GRI (US02) da empresa que categoriza a condicionante.',
  })
  category!: LicenseConditionCategoryResponseDto;

  @ApiProperty({ example: 'FEPAM', nullable: true })
  responsible_agency!: string | null;

  @ApiProperty({ format: 'date-time' })
  due_date!: string;

  @ApiProperty({ enum: LicenseConditionStatusDto })
  status!: LicenseConditionStatusDto;

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
    category: created.category,
    responsible_agency: created.responsible_agency,
    due_date: created.due_date,
    status: created.status,
    risk_level: condition.riskLevel,
  };
}
