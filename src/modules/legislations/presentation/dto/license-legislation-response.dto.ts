import { ApiProperty } from '@nestjs/swagger';
import { LegislationImpact, LicenseLegislationSource } from '@prisma/client';
import { LicenseLegislation } from '../../domain/license-legislation.entity';
import { LegislationResponseDto } from './legislation-response.dto';

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
