import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  LegislationImpact,
  LegislationType,
  LicenseLegislationSource,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Validate,
  ValidationArguments,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { CreateLicenseLegislationBatchItem } from '../../domain/legislation.data';

export class CatalogLegislationDto {
  @ApiProperty({ enum: LegislationType })
  @IsEnum(LegislationType)
  type!: LegislationType;

  @ApiProperty({ example: '237', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  number!: string;

  @ApiProperty({ example: 1997 })
  @IsInt()
  year!: number;

  @ApiProperty({ example: 'CONAMA', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  issuing_body!: string;

  @ApiPropertyOptional({
    example: 'Licenciamento ambiental.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(4095)
  summary?: string | null;
}

@ValidatorConstraint({ name: 'legislationReference', async: false })
class LegislationReferenceConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args?: ValidationArguments): boolean {
    if (!args) return false;
    const item = args.object as CreateLicenseLegislationDto;
    return Boolean(item.legislation_id) !== Boolean(item.legislation);
  }
}

export class CreateLicenseLegislationDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  legislation_id?: string;

  @ApiPropertyOptional({ type: CatalogLegislationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CatalogLegislationDto)
  legislation?: CatalogLegislationDto;

  @ApiProperty({ enum: LicenseLegislationSource })
  @IsEnum(LicenseLegislationSource)
  @Validate(LegislationReferenceConstraint)
  source!: LicenseLegislationSource;

  @ApiPropertyOptional({ maxLength: 4095 })
  @IsOptional()
  @IsString()
  @MaxLength(4095)
  cited_excerpt?: string;

  @ApiPropertyOptional({ enum: LegislationImpact })
  @IsOptional()
  @IsEnum(LegislationImpact)
  impact?: LegislationImpact;

  toDomain(): CreateLicenseLegislationBatchItem {
    return {
      legislationId: this.legislation_id,
      legislation: this.legislation
        ? {
            type: this.legislation.type,
            number: this.legislation.number,
            year: this.legislation.year,
            issuingBody: this.legislation.issuing_body,
            summary: this.legislation.summary,
          }
        : undefined,
      source: this.source,
      citedExcerpt: this.cited_excerpt,
      impact: this.impact,
    };
  }
}

export class CreateLicenseLegislationsDto {
  @ApiProperty({
    type: CreateLicenseLegislationDto,
    isArray: true,
    maxItems: 50,
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateLicenseLegislationDto)
  legislations!: CreateLicenseLegislationDto[];

  toDomain(): CreateLicenseLegislationBatchItem[] {
    return this.legislations.map((item) => item.toDomain());
  }
}
