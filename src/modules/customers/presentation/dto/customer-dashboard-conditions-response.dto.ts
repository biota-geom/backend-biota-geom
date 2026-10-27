import { ApiProperty } from '@nestjs/swagger';
import { CustomerDashboardConditions } from '../../application/get-customer-dashboard-conditions.use-case';
import {
  LicenseConditionResponseDto,
  toLicenseConditionResponse,
} from '../../../licenses/presentation/dto/license-condition-response.dto';

export class CustomerDashboardConditionsResponseDto {
  @ApiProperty({ type: 'integer', example: 8 })
  total_active!: number;

  @ApiProperty({ type: 'integer', example: 4 })
  in_compliance!: number;

  @ApiProperty({ type: 'integer', example: 50, minimum: 0, maximum: 100 })
  compliance_percentage!: number;

  @ApiProperty({ type: LicenseConditionResponseDto, isArray: true })
  critical!: LicenseConditionResponseDto[];
}

export function toCustomerDashboardConditionsResponse(
  dashboard: CustomerDashboardConditions,
): CustomerDashboardConditionsResponseDto {
  return {
    total_active: dashboard.totalActive,
    in_compliance: dashboard.inCompliance,
    compliance_percentage: dashboard.compliancePercentage,
    critical: dashboard.critical.map(toLicenseConditionResponse),
  };
}
