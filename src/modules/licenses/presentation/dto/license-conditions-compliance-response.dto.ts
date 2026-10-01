import { ApiProperty } from '@nestjs/swagger';
import { LicenseConditionsCompliance } from '../../domain/license-conditions-compliance.calculator';

export class LicenseConditionsComplianceResponseDto {
  @ApiProperty({ type: 'integer', example: 8 })
  total_active!: number;

  @ApiProperty({ type: 'integer', example: 4 })
  in_compliance!: number;

  @ApiProperty({
    type: 'integer',
    example: 50,
    minimum: 0,
    maximum: 100,
    description:
      'Percentage of REGULAR conditions over active conditions. 100 when there are no active conditions.',
  })
  compliance_percentage!: number;
}

export function toLicenseConditionsComplianceResponse(
  compliance: LicenseConditionsCompliance,
): LicenseConditionsComplianceResponseDto {
  return {
    total_active: compliance.totalActive,
    in_compliance: compliance.inCompliance,
    compliance_percentage: compliance.compliancePercentage,
  };
}
