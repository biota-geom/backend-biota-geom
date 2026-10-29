import { ApiProperty } from '@nestjs/swagger';
import { License } from '../../domain/license.entity';
import { STATUS_LABELS } from './license-labels';

export class LicenseHistoryItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  customer_id!: string;

  @ApiProperty({ example: 'LO nº 119/2026' })
  process_number!: string;

  @ApiProperty({ example: '2026-01-10T00:00:00.000Z' })
  issue_date!: string;

  @ApiProperty({ example: '2030-01-10T00:00:00.000Z' })
  expiration_date!: string;

  @ApiProperty({ example: 'Renovada/Arquivada' })
  status!: string;

  @ApiProperty({ description: 'True for the license that was requested.' })
  is_current!: boolean;
}

export function toLicenseHistoryResponse(
  licenses: License[],
  requestedLicenseId: string,
): LicenseHistoryItemDto[] {
  return licenses.map((license) => ({
    id: license.id,
    customer_id: license.customerId,
    process_number: license.processNumber,
    issue_date: license.issueDate.toISOString(),
    expiration_date: license.expirationDate.toISOString(),
    status: STATUS_LABELS[license.status],
    is_current: license.id === requestedLicenseId,
  }));
}
