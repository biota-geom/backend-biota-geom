import { ApiProperty } from '@nestjs/swagger';
import { License } from '../../domain/license.entity';
import { STATUS_LABELS } from './license-labels';

export class LicenseRenewedResponseDto {
  @ApiProperty({ format: 'uuid', example: 'uuid-nova' })
  id!: string;

  @ApiProperty({ format: 'uuid', example: 'uuid-antiga' })
  previous_license_id!: string;

  @ApiProperty({ example: 'Regular', enum: ['Regular', 'Atenção', 'Vencida'] })
  status!: string;
}

export function toLicenseRenewedResponse(
  license: License,
): LicenseRenewedResponseDto {
  return {
    id: license.id,
    previous_license_id: license.previousLicenseId ?? '',
    status: STATUS_LABELS[license.status],
  };
}
