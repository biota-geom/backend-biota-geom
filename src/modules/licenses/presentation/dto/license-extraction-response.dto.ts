import { ApiProperty } from '@nestjs/swagger';
import { ConditionPeriodicity, ConditionType } from '@prisma/client';
import {
  LicenseExtraction,
  SuggestedCondition,
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

export class LicenseExtractionResponseDto {
  @ApiProperty({ type: ExtractedLicenseDataDto })
  extracted_data!: ExtractedLicenseDataDto;

  @ApiProperty({ type: [SuggestedConditionDto] })
  suggested_conditions!: SuggestedConditionDto[];
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
  };
}
