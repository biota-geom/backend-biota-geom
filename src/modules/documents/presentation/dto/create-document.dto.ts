import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
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

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-08-15',
    required: false,
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  document_date?: string;

  @ApiProperty({ format: 'uuid', nullable: true, required: false })
  @IsOptional()
  @IsUUID()
  folder_id?: string;
}
