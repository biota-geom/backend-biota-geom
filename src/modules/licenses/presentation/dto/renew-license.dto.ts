import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { plainToInstance, Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class RenewConditionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  condition_id!: string;

  @ApiProperty()
  @IsBoolean()
  fulfilled!: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  copy_to_new?: boolean;

  /*
   * A calendar date only: strict ISO rejects impossible days like 02-30, and
   * the pattern rejects partial dates like "2027" that would silently widen
   * to January 1st. The range is checked against the new license's validity
   * by the use case.
   */
  @ApiPropertyOptional({ example: '2027-10-01', format: 'date' })
  @ValidateIf((item: RenewConditionDto) => item.copy_to_new === true)
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  new_due_date?: string;
}

/*
 * The renewal is a multipart request, so `conditions` arrives as a JSON
 * string. Anything that is not a valid JSON array is left as-is and rejected
 * by the validators below.
 */
function parseConditions({ value }: { value: unknown }): unknown {
  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return value;
    }
  }

  return Array.isArray(parsed)
    ? plainToInstance(RenewConditionDto, parsed as object[])
    : parsed;
}

export class RenewLicenseDto {
  @ApiProperty({ example: 'LO nº 119/2026' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  process_number!: string;

  @ApiProperty({ example: '2026-01-10T00:00:00.000Z' })
  @IsDateString({ strict: true })
  issue_date!: string;

  @ApiProperty({ example: '2030-01-10T00:00:00.000Z' })
  @IsDateString({ strict: true })
  expiration_date!: string;

  @ApiPropertyOptional({
    type: String,
    description:
      'JSON string: [{ condition_id, fulfilled, copy_to_new?, new_due_date? }]. Required when the previous license has conditions.',
  })
  @Transform(parseConditions)
  @IsArray()
  @ValidateNested({ each: true })
  conditions: RenewConditionDto[] = [];
}
