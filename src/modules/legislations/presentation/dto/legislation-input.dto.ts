import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LegislationType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CreateLegislationData } from '../../domain/legislation.data';

export function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

/** Trims text and turns a blank one into null, so "" clears the field. */
export function trimToNull({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();

  return trimmed === '' ? null : trimmed;
}

export class LegislationInputDto {
  @ApiProperty({ enum: LegislationType, example: LegislationType.LEI })
  @IsEnum(LegislationType)
  type!: LegislationType;

  @ApiProperty({ example: '12.305', maxLength: 50 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  number!: string;

  @ApiProperty({ example: 2010, minimum: 1000, maximum: 9999 })
  @IsInt()
  @Min(1000)
  @Max(9999)
  year!: number;

  @ApiPropertyOptional({ example: 'Governo Federal', maxLength: 150 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(150)
  issuing_body?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Institui a Política Nacional de Resíduos Sólidos.',
    maxLength: 4095,
  })
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(4095)
  summary?: string | null;
}

/*
 * The issuing body is part of the catalog identity and a NOT NULL column; an
 * act registered without one is stored with an empty issuing body, so the
 * same act typed again without it is still recognised as the same act.
 */
export function toLegislationData(
  dto: LegislationInputDto,
): CreateLegislationData {
  return {
    type: dto.type,
    number: dto.number,
    year: dto.year,
    issuingBody: dto.issuing_body ?? '',
    summary: dto.summary ?? null,
  };
}
