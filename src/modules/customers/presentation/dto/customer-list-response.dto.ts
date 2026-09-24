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

  @ApiProperty({ example: 6, minimum: 0 })
  total_licenses!: number;

  @ApiProperty({ example: '2026-09-17T14:30:00.000Z' })
  updated_at!: string;

  @ApiProperty({
    type: Number,
    example: 95,
    minimum: 0,
    maximum: 100,
    nullable: true,
    description:
      'Percentage of regular licenses. Null when the customer has no licenses.',
  })
  conformity_percentage!: number | null;
}
