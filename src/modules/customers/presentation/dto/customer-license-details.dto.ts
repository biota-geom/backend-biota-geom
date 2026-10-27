import { ApiProperty } from '@nestjs/swagger';
import { LicenseType } from '@prisma/client';

export class CustomerLicenseDetailsCriticalResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({ enum: LicenseType, example: LicenseType.LO })
  type!: LicenseType;

  @ApiProperty({ example: 'LO 118/2020' })
  process_number!: string;

  @ApiProperty({ format: 'date', example: '2026-09-01' })
  expiration_date!: string;

  @ApiProperty({ enum: ['Regular', 'Atenção', 'Vencida'], example: 'Vencida' })
  status!: string;
}

export class CountsPerStatusResponseDto {
  @ApiProperty({ example: 3 })
  regular?: number;

  @ApiProperty({ example: 2 })
  pending?: number;

  @ApiProperty({ example: 1 })
  expired?: number;
}

export class CustomerLicenseDetailsResponseDto {
  @ApiProperty({
    example: {
      active_licenses: 6,
      pending_items: 3,
    },
  })
  header?: {
    active_licenses: number;
    pending_items: number;
  };

  @ApiProperty({
    type: CountsPerStatusResponseDto,
  })
  counts?: CountsPerStatusResponseDto;

  @ApiProperty({
    type: CustomerLicenseDetailsCriticalResponseDto,
    isArray: true,
  })
  critical?: CustomerLicenseDetailsCriticalResponseDto[];
}
