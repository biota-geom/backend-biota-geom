import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

/*
 * Arrives as multipart/form-data alongside document_file (see
 * LicensesController), so every field lands here as a plain string — there
 * is no JSON body to type-coerce from.
 */
export class CreateLicenseDto {
  @ApiProperty({ example: 'LO' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  type!: string;

  @ApiProperty({ example: 'LO nº 118/2020' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  process_number!: string;

  @ApiProperty({ example: 'FEPAM' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  issuing_agency!: string;

  @ApiProperty({ example: '2020-01-10T00:00:00.000Z' })
  @IsDateString()
  issue_date!: string;

  @ApiProperty({ example: '2025-01-10T00:00:00.000Z' })
  @IsDateString()
  expiration_date!: string;
}
