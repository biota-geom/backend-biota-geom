import { ApiProperty } from '@nestjs/swagger';
import { LegislationType } from '@prisma/client';
import { Legislation } from '../../domain/legislation.entity';

export class LegislationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: LegislationType, example: LegislationType.LEI })
  type!: LegislationType;

  @ApiProperty({ example: '12.305' })
  number!: string;

  @ApiProperty({ example: 2010 })
  year!: number;

  @ApiProperty({ example: 'Governo Federal' })
  issuing_body!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Institui a Política Nacional de Resíduos Sólidos.',
  })
  summary!: string | null;
}

export function toLegislationResponse(
  legislation: Legislation,
): LegislationResponseDto {
  return {
    id: legislation.id,
    type: legislation.type,
    number: legislation.number,
    year: legislation.year,
    issuing_body: legislation.issuingBody,
    summary: legislation.summary,
  };
}
