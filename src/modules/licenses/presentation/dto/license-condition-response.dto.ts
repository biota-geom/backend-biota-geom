import { ApiProperty } from '@nestjs/swagger';
import { LicenseConditionWithRisk } from '../../application/list-license-conditions-by-customer.use-case';
import { LicenseConditionRiskLevel } from '../../domain/license-condition-risk-level';

export class LicenseConditionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Automonitoramento Atmosférico' })
  title!: string;

  @ApiProperty({
    example:
      'Avaliação periódica de emissões em chaminés e qualidade do ar no entorno industrial.',
  })
  description!: string;

  @ApiProperty({ example: 'Emissões' })
  category!: string;

  @ApiProperty({ format: 'date-time' })
  due_date!: string;

  @ApiProperty({ enum: LicenseConditionRiskLevel, example: 'RISK' })
  risk_level!: LicenseConditionRiskLevel;
}

export function toLicenseConditionResponse(
  condition: LicenseConditionWithRisk,
): LicenseConditionResponseDto {
  return {
    id: condition.id,
    title: condition.title,
    description: condition.description,
    category: condition.category,
    due_date: condition.dueDate.toISOString(),
    risk_level: condition.riskLevel,
  };
}
