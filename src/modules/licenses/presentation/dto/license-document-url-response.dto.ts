import { ApiProperty } from '@nestjs/swagger';
import { DocumentAccessUrl } from '../../domain/license-document-storage';

export class LicenseDocumentUrlResponseDto {
  @ApiProperty({
    example:
      'https://bucket.s3.amazonaws.com/licenses/<customerId>/<file>.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=900&X-Amz-Signature=...',
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

export function toLicenseDocumentUrlResponse(
  accessUrl: DocumentAccessUrl,
): LicenseDocumentUrlResponseDto {
  return {
    document_url: accessUrl.url,
    expires_in: accessUrl.expiresInSeconds,
  };
}
