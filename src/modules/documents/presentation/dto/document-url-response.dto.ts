import { ApiProperty } from '@nestjs/swagger';
import { FileAccessUrl } from '../../../../common/storage/file-storage';

export class DocumentUrlResponseDto {
  @ApiProperty({
    example: 'https://storage.example.com/document.pdf?signature=...',
  })
  document_url!: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 900,
    description:
      'Seconds until document_url expires; null when the storage driver serves the file without expiration (local).',
  })
  expires_in!: number | null;
}

export function toDocumentUrlResponse(
  accessUrl: FileAccessUrl,
): DocumentUrlResponseDto {
  return {
    document_url: accessUrl.url,
    expires_in: accessUrl.expiresInSeconds,
  };
}
