import { ApiProperty } from '@nestjs/swagger';
import { LicenseConditionTargetOperator } from '@prisma/client';
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

  @ApiProperty({ format: 'uuid', nullable: true })
  target_metric_id!: string | null;

  @ApiProperty({ enum: LicenseConditionTargetOperator, nullable: true })
  target_operator!: LicenseConditionTargetOperator | null;

  @ApiProperty({ example: 150, nullable: true })
  target_value!: number | null;

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
    target_metric_id: created.target_metric_id,
    target_operator: created.target_operator,
    target_value: created.target_value,
    risk_level: condition.riskLevel,
  };
}
