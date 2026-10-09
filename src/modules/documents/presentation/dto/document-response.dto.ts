import { ApiProperty } from '@nestjs/swagger';
import { CustomerDocumentType } from '../../domain/customer-document-type';
import { CustomerDocument } from '../../domain/document.entity';

export class DocumentUploaderResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Consultancy X' })
  name!: string;
}

export class DocumentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Noise Report 2026' })
  title!: string;

  @ApiProperty({ enum: CustomerDocumentType })
  type!: CustomerDocumentType;

  @ApiProperty({ type: String, format: 'date' })
  document_date!: string;

  @ApiProperty({ example: 'laudo-ruido.pdf' })
  file_name!: string;

  @ApiProperty({ example: 1048576 })
  size_bytes!: number;

  @ApiProperty({ type: DocumentUploaderResponseDto })
  uploaded_by!: DocumentUploaderResponseDto;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at!: string;
}

export function toDocumentResponse(
  document: CustomerDocument,
): DocumentResponseDto {
  return {
    id: document.id,
    title: document.title,
    type: document.type,
    document_date: document.documentDate.toISOString().slice(0, 10),
    file_name: document.fileName,
    size_bytes: document.sizeBytes,
    uploaded_by: document.uploadedBy,
    created_at: document.createdAt.toISOString(),
  };
}
