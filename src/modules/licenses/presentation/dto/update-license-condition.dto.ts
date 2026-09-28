import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

/*
 * PUT replaces the condition, so every editable field is required. Two fields
 * the edit form shows are deliberately not here: the risk level, computed
 * from due_date on every read, and the issuing agency, which belongs to the
 * linked license — both are answers the server owns, not input it takes.
 *
 * Max lengths mirror prisma/schema.prisma so an over-long value is rejected
 * as a 400 with a readable message instead of failing at the column.
 */
export class UpdateLicenseConditionDto {
  @ApiProperty({ example: 'MTR - Manifesto de Transporte de Resíduos' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title!: string;

  @ApiProperty({
    example:
      'Emissão de manifesto obrigatório para movimentação e destinação final de resíduos industriais.',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  @ApiProperty({ example: 'Resíduos' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  category!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  license_id!: string;

  @ApiProperty({ example: '2026-06-30T00:00:00.000Z' })
  @IsDateString()
  due_date!: string;
}
