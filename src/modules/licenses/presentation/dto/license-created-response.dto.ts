import { ApiProperty } from '@nestjs/swagger';
import { License } from '../../domain/license.entity';
import { STATUS_LABELS } from './license-labels';

export class LicenseCreatedResponseDto {
  @ApiProperty({ format: 'uuid', example: 'uuid-licenca-nova' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  customer_id!: string;

  @ApiProperty({ example: 'LO' })
  type!: string;

  @ApiProperty({ example: 'LO nº 118/2020' })
  process_number!: string;

  @ApiProperty({ example: 'FEPAM' })
  issuing_agency!: string;

  @ApiProperty({ format: 'date-time' })
  issue_date!: string;

  @ApiProperty({ format: 'date-time' })
  expiration_date!: string;

  @ApiProperty({
    example: 'Vencida',
    enum: ['Regular', 'Atenção', 'Vencida', 'Renovada/Arquivada'],
  })
  status!: string;

  @ApiProperty({
    example: 'https://bucket.aws.com/licenses/lo-118-2020.pdf',
  })
  document_url!: string;

  @ApiProperty({ format: 'date-time' })
  created_at!: string;
}

export function toLicenseCreatedResponse(
  license: License,
): LicenseCreatedResponseDto {
  return {
    id: license.id,
    customer_id: license.customerId,
    type: license.type,
    process_number: license.processNumber,
    issuing_agency: license.issuingAgency,
    issue_date: license.issueDate.toISOString(),
    expiration_date: license.expirationDate.toISOString(),
    status: STATUS_LABELS[license.status],
    document_url: license.documentUrl,
    created_at: license.createdAt.toISOString(),
  };
}
