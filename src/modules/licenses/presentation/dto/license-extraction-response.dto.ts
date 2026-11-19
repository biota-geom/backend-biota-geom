import { ApiProperty } from '@nestjs/swagger';
import {
  ConditionPeriodicity,
  ConditionType,
  LegislationImpact,
  LegislationType,
  LicenseLegislationSource,
} from '@prisma/client';
import { LICENSES_MESSAGES } from '../messages/licenses.messages.pt-br';
import {
  ExtractionFailureReason,
  ExtractionJob,
} from '../../domain/extraction-job';
import {
  LicenseExtraction,
  SuggestedCondition,
  SuggestedLegislation,
} from '../../domain/license-extraction';

export class ExtractedLicenseDataDto {
  @ApiProperty({
    type: String,
    nullable: true,
    example: 'LO',
    description: 'Sigla do tipo de licença como impressa no documento.',
  })
  type!: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'LO nº 118/2020' })
  process_number!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'FEPAM',
    description: 'Nome ou sigla do órgão emissor como impresso no documento.',
  })
  issuing_agency!: string | null;

  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    example: '2020-01-10',
  })
  issue_date!: string | null;

  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    example: '2025-01-10',
  })
  expiration_date!: string | null;
}

export class SuggestedConditionDto {
  @ApiProperty({ type: String, nullable: true, example: 'Resíduos Sólidos' })
  environmental_descriptor!: string | null;

  @ApiProperty({ example: 'Apresentar relatório semestral de resíduos.' })
  description!: string;

  @ApiProperty({ enum: ConditionType, nullable: true })
  condition_type!: ConditionType | null;

  @ApiProperty({ enum: ConditionPeriodicity, nullable: true })
  periodicity!: ConditionPeriodicity | null;

  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    example: '2025-07-10',
  })
  due_date!: string | null;
}

export class SuggestedLegislationActDto {
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

/*
 * Same shape as one item of POST /licenses/:licenseId/legislations/batch, so
 * the client sends the entries the operator kept without remapping fields.
 */
export class SuggestedLegislationDto {
  @ApiProperty({ type: SuggestedLegislationActDto })
  legislation!: SuggestedLegislationActDto;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '…conforme a Lei nº 12.305/2010…',
  })
  cited_excerpt!: string | null;

  @ApiProperty({
    enum: LicenseLegislationSource,
    example: LicenseLegislationSource.SCAN,
  })
  source!: LicenseLegislationSource;

  @ApiProperty({
    enum: LegislationImpact,
    nullable: true,
    description: 'Sugestão da IA, para o operador revisar.',
  })
  impact!: LegislationImpact | null;
}

export class LicenseExtractionResponseDto {
  @ApiProperty({ type: ExtractedLicenseDataDto })
  extracted_data!: ExtractedLicenseDataDto;

  @ApiProperty({ type: [SuggestedConditionDto] })
  suggested_conditions!: SuggestedConditionDto[];

  @ApiProperty({
    type: [SuggestedLegislationDto],
    description:
      'Legislações citadas no documento. Nada é salvo: o operador escolhe quais vincular.',
  })
  suggested_legislations!: SuggestedLegislationDto[];
}

function toSuggestedConditionDto(
  condition: SuggestedCondition,
): SuggestedConditionDto {
  return {
    environmental_descriptor: condition.environmentalDescriptor,
    description: condition.description,
    condition_type: condition.conditionType,
    periodicity: condition.periodicity,
    due_date: condition.dueDate,
  };
}

function toSuggestedLegislationDto(
  suggestion: SuggestedLegislation,
): SuggestedLegislationDto {
  const { legislation } = suggestion;

  return {
    legislation: {
      type: legislation.type,
      number: legislation.number,
      year: legislation.year,
      issuing_body: legislation.issuingBody,
      summary: legislation.summary,
    },
    cited_excerpt: suggestion.citedExcerpt,
    source: suggestion.source,
    impact: suggestion.impact,
  };
}

export function toLicenseExtractionResponse(
  extraction: LicenseExtraction,
): LicenseExtractionResponseDto {
  const { extractedData } = extraction;

  return {
    extracted_data: {
      type: extractedData.type,
      process_number: extractedData.processNumber,
      issuing_agency: extractedData.issuingAgency,
      issue_date: extractedData.issueDate,
      expiration_date: extractedData.expirationDate,
    },
    suggested_conditions: extraction.suggestedConditions.map(
      toSuggestedConditionDto,
    ),
    suggested_legislations: extraction.suggestedLegislations.map(
      toSuggestedLegislationDto,
    ),
  };
}

export class StartLicenseExtractionResponseDto {
  @ApiProperty({ format: 'uuid' })
  job_id!: string;
}

export class LicenseExtractionJobResponseDto {
  @ApiProperty({ enum: ['PENDING', 'DONE', 'FAILED'] })
  status!: ExtractionJob['status'];

  @ApiProperty({ type: LicenseExtractionResponseDto, nullable: true })
  result!: LicenseExtractionResponseDto | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Mensagem amigável quando status é FAILED; o motivo interno fica nos logs.',
  })
  error!: string | null;
}

const FAILURE_MESSAGES: Record<ExtractionFailureReason, string> = {
  UNREADABLE: LICENSES_MESSAGES.EXTRACTION_UNREADABLE,
  UNAVAILABLE: LICENSES_MESSAGES.EXTRACTION_UNAVAILABLE,
  TIMEOUT: LICENSES_MESSAGES.EXTRACTION_TIMEOUT,
};

export function toLicenseExtractionJobResponse(
  job: ExtractionJob,
): LicenseExtractionJobResponseDto {
  switch (job.status) {
    case 'PENDING':
      return { status: 'PENDING', result: null, error: null };
    case 'DONE':
      return {
        status: 'DONE',
        result: toLicenseExtractionResponse(job.extraction),
        error: null,
      };
    case 'FAILED':
      return {
        status: 'FAILED',
        result: null,
        error: FAILURE_MESSAGES[job.reason],
      };
  }
}
