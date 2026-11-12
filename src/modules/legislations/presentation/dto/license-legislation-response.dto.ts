import { ApiProperty } from '@nestjs/swagger';
import {
  LegislationImpact,
  LegislationType,
  LicenseLegislationSource,
} from '@prisma/client';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { LicenseLegislation } from '../../domain/license-legislation.entity';

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

export class SearchLegislationsQueryDto {
  @ApiProperty({ example: '12.305' })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  search!: string;
}

export class SearchLegislationsResponseDto {
  @ApiProperty({ type: LegislationResponseDto, isArray: true })
  legislations!: LegislationResponseDto[];
}

export class LicenseLegislationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: LegislationResponseDto })
  legislation!: LegislationResponseDto;

  @ApiProperty({
    enum: LicenseLegislationSource,
    example: LicenseLegislationSource.SCAN,
  })
  source!: LicenseLegislationSource;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '…conforme a Lei nº 12.305/2010…',
  })
  cited_excerpt!: string | null;

  @ApiProperty({ enum: LegislationImpact, nullable: true })
  impact!: LegislationImpact | null;

  @ApiProperty({ type: String, nullable: true })
  technical_analysis!: string | null;

  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  read_at!: string | null;

  @ApiProperty({ example: '2026-11-02T12:00:00.000Z' })
  created_at!: string;
}

export function toLicenseLegislationResponse(
  link: LicenseLegislation,
): LicenseLegislationResponseDto {
  const { legislation } = link;

  return {
    id: link.id,
    legislation: {
      id: legislation.id,
      type: legislation.type,
      number: legislation.number,
      year: legislation.year,
      issuing_body: legislation.issuingBody,
      summary: legislation.summary,
    },
    source: link.source,
    cited_excerpt: link.citedExcerpt,
    impact: link.impact,
    technical_analysis: link.technicalAnalysis,
    read_at: link.readAt?.toISOString() ?? null,
    created_at: link.createdAt.toISOString(),
  };
}
