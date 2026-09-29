import { ApiProperty } from '@nestjs/swagger';

export class CustomerListResponseDTO {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Unidade Industrial RS' })
  name!: string;

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
}
