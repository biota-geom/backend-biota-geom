import { ApiProperty } from '@nestjs/swagger';
import { CustomerDocumentType } from '../../domain/customer-document-type';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateDocumentDto {
  @ApiProperty({ example: 'Noise Report 2026' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ enum: CustomerDocumentType, example: 'LAUDO' })
  @IsEnum(CustomerDocumentType)
  type!: CustomerDocumentType;

  @ApiProperty({ type: String, format: 'date', example: '2026-08-15' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  document_date!: string;
}
