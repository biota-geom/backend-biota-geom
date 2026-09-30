import { ApiProperty } from '@nestjs/swagger';
import { ListLicensesByCustomerResult } from '../../application/list-licenses-by-customer.use-case';
import { License } from '../../domain/license.entity';
import { LICENSE_TYPE_LABELS, STATUS_LABELS } from './license-labels';

export class LicenseSummaryDto {
  @ApiProperty({ example: 6 })
  total!: number;

  @ApiProperty({ example: 3 })
  regular!: number;

  @ApiProperty({ example: 2 })
  attention!: number;

  @ApiProperty({ example: 1 })
  expired!: number;
}

export class LicensePanelItemDto {
  @ApiProperty({ format: 'uuid', example: 'uuid-licenca-1' })
  id!: string;

  @ApiProperty({ example: 'Licença Prévia (LP)' })
  type!: string;

  @ApiProperty({ example: 'LP nº 482/2024' })
  process_number!: string;

  @ApiProperty({ example: 'FEPAM' })
  issuing_agency!: string | null;

  @ApiProperty({ format: 'date-time' })
  issue_date!: string;

  @ApiProperty({ format: 'date-time' })
  expiration_date!: string;

  @ApiProperty({ example: 'Regular', enum: ['Regular', 'Atenção', 'Vencida'] })
  status!: string;
}

export class LicensePanelResponseDto {
  @ApiProperty({ type: LicenseSummaryDto })
  summary!: LicenseSummaryDto;

  @ApiProperty({ type: LicensePanelItemDto, isArray: true })
  licenses!: LicensePanelItemDto[];
}

function toLicensePanelItem(license: License): LicensePanelItemDto {
  return {
    id: license.id,
    type: LICENSE_TYPE_LABELS[license.type],
    process_number: license.processNumber,
    issuing_agency: license.issuingAgency?.name ?? null,
    issue_date: license.issueDate.toISOString(),
    expiration_date: license.expirationDate.toISOString(),
    status: STATUS_LABELS[license.status],
  };
}

export function toLicensePanelResponse(
  result: ListLicensesByCustomerResult,
): LicensePanelResponseDto {
  return {
    summary: result.summary,
    licenses: result.licenses.map(toLicensePanelItem),
  };
}
