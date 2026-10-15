import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class RenewLicenseDto {
  @ApiProperty({ example: 'LO nº 119/2026' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  process_number!: string;

  @ApiProperty({ example: '2026-01-10T00:00:00.000Z' })
  @IsDateString()
  issue_date!: string;

  @ApiProperty({ example: '2030-01-10T00:00:00.000Z' })
  @IsDateString()
  expiration_date!: string;
}
