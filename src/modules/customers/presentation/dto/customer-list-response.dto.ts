import { ApiProperty } from '@nestjs/swagger';

export class CustomerListResponseDTO {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Unidade Industrial RS' })
  name!: string;

  @ApiProperty({ example: '12345678000199' })
  document!: string;

  @ApiProperty({ example: 'Ativo' })
  status!: string;

  @ApiProperty({ example: 'Siderurgia' })
  segment!: string;

  @ApiProperty({ example: 'Porto Alegre - RS' })
  location!: string;

  @ApiProperty({ type: 'integer', example: 6 })
  total_licenses!: number;

  @ApiProperty({ format: 'date-time', example: '2026-09-17T14:30:00.000Z' })
  updated_at!: string;

  @ApiProperty({
    type: 'integer',
    example: 95,
    minimum: 0,
    maximum: 100,
    description:
      'Percentage of REGULAR conditions over active conditions (same value as GET /customers/:customerId/license-conditions/compliance). 100 when there are no active conditions.',
  })
  conformity_percentage!: number;
}
